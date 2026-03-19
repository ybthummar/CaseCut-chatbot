"""
CaseCut AI – Role-aware prompt templates with hallucination guardrails.

Five personas:
  • Judge    → ratio decidendi, authoritative stance, neutral
  • Lawyer   → persuasive, strategic citations, argument chains
  • Student  → educational, simplified, case-study format
  • Summary  → concise executive summary, bullet-point format
  • Strategy → deep strategic legal advice, outcomes & risks
"""

# ─── Hallucination guardrail block (injected into EVERY prompt) ──────

GUARDRAIL_BLOCK = """
CRITICAL RULES — You MUST follow these strictly:
1. ONLY use information present in the CONTEXT / CASES provided below. Do NOT fabricate, invent, or assume any legal facts, case names, dates, or holdings.
2. If the answer is NOT found in the provided context, respond EXACTLY: "⚠️ The requested information was not found in the available documents. Please try rephrasing your query or uploading the relevant document."
3. ALWAYS cite your sources using the format shown below. Every factual claim must have a supporting reference.
4. NEVER generate fictitious case names, section numbers, or legal provisions.
5. Prefer QUOTING relevant passages from the context over paraphrasing when accuracy matters.
6. If you are only partially confident, say so explicitly and indicate which parts are supported by the context.

CITATION FORMAT (use this for every response):
At the end of your answer, include a "📎 Sources" section:
📎 **Sources:**
- [Case from <Court>] — IPC Section <X> — Outcome: <outcome>
- [Case from <Court>] — Relevant excerpt: "<quote>"
"""

# ─── System-level role instructions ──────────────────────────────────

ROLE_SYSTEM_PROMPTS = {
    "judge": (
        "You are an experienced judge reviewing case precedents for the Indian judiciary. "
        "Summarize relevant precedents objectively. Focus on ratio decidendi, alignments "
        "with higher courts, and reasoning consistency. Maintain a neutral, authoritative "
        "judicial tone throughout."
    ),
    "lawyer": (
        "You are a senior legal counsel building persuasive arguments for Indian courts. "
        "Retrieve favorable cases, generate strategic arguments, cite successful defenses "
        "or prosecutions, and explain how to present the position convincingly. Use a "
        "persuasive, detail-oriented tone."
    ),
    "student": (
        "You are a distinguished law professor teaching Indian law. Explain cases like a "
        "case study — covering history, important facts, legal principles, and outcomes. "
        "Simplify complex arguments and use examples a first-year law student would grasp."
    ),
    "summary": (
        "You are a legal document summariser specialising in Indian law. Produce concise, "
        "scannable executive summaries. Use bullet points, highlight key holdings, cite "
        "specific sections, and keep the output brief and actionable."
    ),
    "strategy": (
        "You are a senior legal strategist and advisor specialising in Indian law. "
        "Provide deep strategic analysis of legal situations including possible outcomes, "
        "strengths and weaknesses of each position, recommended litigation strategies, "
        "and precedent relevance. Your analysis should be thorough and actionable. "
        "IMPORTANT: Clearly state that your analysis is for informational purposes only "
        "and does not constitute legal counsel."
    ),
    "precedent": (
        "You are an expert legal researcher specialising in finding and analyzing Indian case precedents. "
        "Your goal is to extract the most relevant prior cases matching the user's query and explain exactly "
        "how they act as binding or persuasive precedents."
    ),
}

# ─── Structured output instructions per role ─────────────────────────

ROLE_OUTPUT_INSTRUCTIONS = {
    "judge": """Provide a judicial analysis including:
- Key ratio decidendi from each cited case
- Alignment with higher court rulings
- Areas of conflicting interpretation across jurisdictions
- Recommended judicial approach based on precedent weight
Cite specific IPC / BNS sections where applicable.""",

    "lawyer": """Provide a strategic legal analysis including:
- Applicable legal principles and most favourable precedents
- Argument chains linking the facts to the cited cases
- Practical implications for litigation strategy
- Specific IPC / BNS sections and their judicial interpretations
Be thorough, cite specifics, and use precise legal terminology.""",

    "student": """Provide an educational explanation including:
- A simple breakdown of what happened in each case
- Key legal concepts involved (explained clearly)
- Why these cases are important as precedents
- How they connect to the topic under study
Use accessible language, define legal terms, and give real-world analogies.""",

    "summary": """Provide a concise executive summary including:
- Key facts (2-3 bullet points)
- Core legal issues identified
- Court holdings and reasoning (brief)
- Final outcome and implications
Keep it scannable. Use bullet points and bold for emphasis.""",

    "strategy": """Provide a comprehensive strategic legal analysis including:

**1. Situation Assessment:**
- Core legal issues at stake
- Applicable laws, sections, and precedents from the context

**2. Strengths & Weaknesses:**
- Strong points that favour the position
- Vulnerabilities or risks to be aware of

**3. Possible Legal Outcomes:**
- Most likely outcome based on precedent
- Best-case and worst-case scenarios
- Probability assessment (high / medium / low confidence)

**4. Recommended Strategy:**
- Suggested legal approach and argumentation strategy
- Key precedents to leverage
- Potential counter-arguments to prepare for

**5. Precedent Relevance:**
- How each cited case supports or challenges the position
- Distinguishing factors from the current situation

⚠️ *This analysis is for informational and research purposes only. It does not constitute legal advice. Consult a qualified legal professional for specific legal matters.*""",

    "precedent": """Provide a detailed precedent analysis including:
- A clear list of relevant precedent cases from the context
- The core legal principles established by each case
- The factual similarities between the precedents and the query
- The final outcome of the referenced cases
Structure your response as a formal legal research memo.""",
}


# ─── Retrieval bias hints (used by ranker) ───────────────────────────

ROLE_RETRIEVAL_BIAS = {
    "judge": {
        "prefer_courts": ["Supreme Court of India", "High Court"],
        "prefer_outcomes": None,          # neutral
        "court_weight_boost": 0.25,       # more weight to court authority
    },
    "lawyer": {
        "prefer_courts": None,            # all courts valid
        "prefer_outcomes": None,          # handled at prompt level
        "court_weight_boost": 0.0,
    },
    "student": {
        "prefer_courts": ["Supreme Court of India", "High Court"],
        "prefer_outcomes": None,
        "court_weight_boost": 0.10,       # slight bias to well-known courts
    },
    "summary": {
        "prefer_courts": None,
        "prefer_outcomes": None,
        "court_weight_boost": 0.0,        # neutral — pure semantic relevance
    },
    "strategy": {
        "prefer_courts": ["Supreme Court of India", "High Court"],
        "prefer_outcomes": None,
        "court_weight_boost": 0.15,
    },
    "precedent": {
        "prefer_courts": ["Supreme Court of India", "High Court"],
        "prefer_outcomes": None,
        "court_weight_boost": 0.20,
    },
}


def build_rag_prompt(
    role: str,
    query: str,
    context_block: str,
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Assemble the final prompt sent to the LLM.

    Args:
        role:                 'judge' | 'lawyer' | 'student' | 'strategy'
        query:                user's raw question
        context_block:        newline-joined case excerpts from retrieval
        conversation_history: optional list of {role, text} dicts for context

    Returns:
        Full prompt string ready for the chat model.
    """
    system = ROLE_SYSTEM_PROMPTS.get(role, ROLE_SYSTEM_PROMPTS["lawyer"])
    output = ROLE_OUTPUT_INSTRUCTIONS.get(role, ROLE_OUTPUT_INSTRUCTIONS["lawyer"])

    # Build conversation context if available
    history_block = ""
    if conversation_history:
        turns = []
        for turn in conversation_history[-6:]:  # last 3 exchanges max
            prefix = "USER" if turn.get("role") == "user" else "ASSISTANT"
            turns.append(f"{prefix}: {turn['text'][:300]}")
        history_block = (
            "\n\nPREVIOUS CONVERSATION (for context only):\n"
            + "\n".join(turns)
            + "\n"
        )

    return f"""{system}

{GUARDRAIL_BLOCK}

{output}
{history_block}
Based on the following retrieved legal cases, respond to the user's query.

CASES:
{context_block}

USER QUERY: {query}

Provide a clear, structured response with citations."""


def build_pdf_chat_prompt(
    role: str,
    query: str,
    document_context: str,
    conversation_history: list[dict] | None = None,
) -> str:
    """
    Build a prompt for chatting with an uploaded PDF document.

    Args:
        role:                 persona to use
        query:                user's question about the document
        document_context:     extracted text chunks from the PDF
        conversation_history: optional prior turns

    Returns:
        Full prompt string.
    """
    system = ROLE_SYSTEM_PROMPTS.get(role, ROLE_SYSTEM_PROMPTS["lawyer"])
    output = ROLE_OUTPUT_INSTRUCTIONS.get(role, ROLE_OUTPUT_INSTRUCTIONS["lawyer"])

    history_block = ""
    if conversation_history:
        turns = []
        for turn in conversation_history[-6:]:
            prefix = "USER" if turn.get("role") == "user" else "ASSISTANT"
            turns.append(f"{prefix}: {turn['text'][:300]}")
        history_block = (
            "\n\nPREVIOUS CONVERSATION:\n" + "\n".join(turns) + "\n"
        )

    return f"""{system}

{GUARDRAIL_BLOCK}

{output}
{history_block}
The user has uploaded a legal document. Answer their question using ONLY the document content below.

DOCUMENT CONTENT:
{document_context}

USER QUESTION: {query}

Provide a clear, structured answer with references to specific parts of the document."""
