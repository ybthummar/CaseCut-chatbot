"""
Feedback analyzer for AI-generated legal outputs.

Converts user feedback into:
  - feedback_type
  - issue_detected
  - improvement_suggestion
"""

from __future__ import annotations

from typing import Optional


_WRONG_IPC_KEYWORDS = {
    "wrong ipc",
    "incorrect ipc",
    "wrong section",
    "incorrect section",
    "ipc mismatch",
    "wrongly detected section",
    "wrong ipc section",
    "section is wrong",
    "detected wrong section",
}

_LENGTH_KEYWORDS = {
    "too short",
    "too long",
    "very brief",
    "overly brief",
    "very long",
    "lengthy",
    "verbose",
    "wordy",
    "needs more detail",
    "more detail",
    "less detail",
    "shorten",
}

_MISSING_INFO_KEYWORDS = {
    "important points missing",
    "important legal points missing",
    "missing points",
    "missing legal points",
    "left out",
    "omitted",
    "did not include",
    "didn't include",
    "missing precedent",
    "missing facts",
    "missing sections",
    "not complete",
    "incomplete",
}

_UNCLEAR_KEYWORDS = {
    "not clear",
    "unclear",
    "confusing",
    "hard to understand",
    "poor explanation",
    "vague",
    "ambiguous",
    "explain better",
}

_HALLUCINATION_KEYWORDS = {
    "hallucinated",
    "made up",
    "fabricated",
    "fake",
    "wrong legal info",
    "incorrect legal info",
    "factually wrong",
    "inaccurate",
    "non existent law",
    "non-existent law",
    "not true",
}

_IRRELEVANT_KEYWORDS = {
    "irrelevant",
    "off topic",
    "off-topic",
    "not relevant",
    "unrelated",
    "didn't answer",
    "did not answer",
    "not about my query",
}

_PARTIAL_CUES = {
    "partially",
    "somewhat",
    "but",
    "however",
    "could be better",
    "needs improvement",
}


def _contains_any(text: str, phrases: set[str]) -> bool:
    return any(phrase in text for phrase in phrases)


def _normalize_user_feedback(user_feedback: str) -> str:
    value = (user_feedback or "").strip().lower()
    if value in {"helpful", "positive", "yes", "1", "thumbs up", "up"}:
        return "helpful"
    if value in {"not helpful", "not_helpful", "negative", "no", "-1", "thumbs down", "down"}:
        return "not_helpful"
    return "helpful"


def _looks_legally_grounded(ai_response: str) -> bool:
    text = (ai_response or "").lower()
    legal_markers = ("section", "ipc", "act", "court", "judgment", "legal", "precedent")
    return any(marker in text for marker in legal_markers)


def _detect_issue(
    text: str,
    *,
    ai_response: str,
    allow_length_inference: bool,
) -> str:
    if _contains_any(text, _WRONG_IPC_KEYWORDS):
        return "Wrong IPC section detected"
    if _contains_any(text, _HALLUCINATION_KEYWORDS):
        return "Hallucinated / incorrect legal info"
    if _contains_any(text, _LENGTH_KEYWORDS):
        return "Summary too short or too long"
    if _contains_any(text, _MISSING_INFO_KEYWORDS):
        return "Important legal points missing"
    if _contains_any(text, _UNCLEAR_KEYWORDS):
        return "Explanation not clear"

    response_len = len((ai_response or "").strip())
    if allow_length_inference and (response_len < 160 or response_len > 2600):
        return "Summary too short or too long"
    if allow_length_inference and not _looks_legally_grounded(ai_response):
        return "Important legal points missing"
    return ""


def _map_feedback_type(
    normalized_feedback: str,
    issue: str,
    comment_text: str,
) -> str:
    if normalized_feedback == "helpful":
        if issue or _contains_any(comment_text, _PARTIAL_CUES):
            return "Partially Helpful"
        return "Correct and Helpful"

    if _contains_any(comment_text, _IRRELEVANT_KEYWORDS):
        return "Irrelevant Response"
    if issue in {"Wrong IPC section detected", "Hallucinated / incorrect legal info"}:
        return "Incorrect Output"
    if issue == "Important legal points missing":
        return "Missing Important Information"
    if issue == "Explanation not clear":
        return "Poor Explanation"
    if issue == "Summary too short or too long":
        return "Partially Helpful"
    return "Incorrect Output"


def _improvement_for_issue(issue: str, feedback_type: str) -> str:
    if issue == "Wrong IPC section detected":
        return (
            "Re-validate offence facts against IPC definitions before finalizing sections, "
            "and explain why each detected section applies."
        )
    if issue == "Summary too short or too long":
        return (
            "Match the requested summary depth and use a structured format: Facts, Issues, "
            "Applicable Law, Court Reasoning, and Outcome."
        )
    if issue == "Important legal points missing":
        return (
            "Include key legal facts, applicable sections, relevant precedents, and the final "
            "legal outcome so the response is complete."
        )
    if issue == "Explanation not clear":
        return (
            "Use clearer step-by-step legal reasoning with plain language and explicitly connect "
            "facts to statutes and conclusions."
        )
    if issue == "Hallucinated / incorrect legal info":
        return (
            "Ground every legal claim in verified statutes or cited judgments and avoid assertions "
            "that cannot be supported by sources."
        )
    if feedback_type == "Correct and Helpful":
        return (
            "Maintain this quality with accurate legal references and concise, well-structured explanations."
        )
    return (
        "Improve legal relevance and structure by directly answering the query and citing the most applicable law."
    )


def analyze_feedback(
    ai_response: str,
    user_feedback: str,
    user_comment: Optional[str] = None,
) -> dict[str, str]:
    """
    Analyze feedback for legal AI outputs and return structured JSON-ready fields.
    """
    normalized_feedback = _normalize_user_feedback(user_feedback)
    comment_text = (user_comment or "").strip().lower()
    merged_text = " ".join(
        part for part in [comment_text, (ai_response or "").strip().lower()] if part
    )

    allow_length_inference = (
        normalized_feedback != "helpful"
        and not _contains_any(comment_text, _IRRELEVANT_KEYWORDS)
    )

    issue = _detect_issue(
        merged_text,
        ai_response=ai_response,
        allow_length_inference=allow_length_inference,
    )
    feedback_type = _map_feedback_type(normalized_feedback, issue, comment_text)

    # Keep issue blank for fully positive feedback so downstream analytics can treat it as no issue.
    if feedback_type == "Correct and Helpful":
        issue_detected = ""
    elif feedback_type == "Irrelevant Response" and not issue:
        issue_detected = "Important legal points missing"
    else:
        issue_detected = issue or "Explanation not clear"
    improvement_suggestion = _improvement_for_issue(issue_detected, feedback_type)

    return {
        "feedback_type": feedback_type,
        "issue_detected": issue_detected,
        "improvement_suggestion": improvement_suggestion,
    }
