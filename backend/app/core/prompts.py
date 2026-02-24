"""
CaseCut AI – Role-aware prompt templates.

Three personas:
  • Judge   → ratio decidendi, authoritative stance, neutral
  • Lawyer  → persuasive, strategic citations, argument chains
  • Student → educational, simplified, case-study format
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
}


def build_rag_prompt(role: str, query: str, context_block: str) -> str:
    """
    Assemble the final prompt sent to the LLM.

    Args:
        role:          'judge' | 'lawyer' | 'student'
        query:         user's raw question
        context_block: newline-joined case excerpts from retrieval

    Returns:
        Full prompt string ready for the chat model.
    """
    system = ROLE_SYSTEM_PROMPTS.get(role, ROLE_SYSTEM_PROMPTS["lawyer"])
    output = ROLE_OUTPUT_INSTRUCTIONS.get(role, ROLE_OUTPUT_INSTRUCTIONS["lawyer"])

    return f"""{system}

{output}

Based on the following retrieved legal cases, respond to the user's query.

CASES:
{context_block}

USER QUERY: {query}

Provide a clear, structured response."""
