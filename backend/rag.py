"""
RAG reasoning layer for CollegeConnect.

This module supports:
1. Cutoff-based grounded explanations.
2. State-rank-based grounded explanations.
"""

import json
import os
from pathlib import Path

from dotenv import load_dotenv
from google import genai


# ---------------------------------------------------------
# Environment configuration
# ---------------------------------------------------------

PROJECT_ROOT = Path(__file__).resolve().parent.parent

load_dotenv(PROJECT_ROOT / ".env")


GEMINI_API_KEY = os.getenv(
    "GEMINI_API_KEY"
)

GEMINI_MODEL = os.getenv(
    "GEMINI_MODEL",
    "gemini-3.5-flash-lite"
)


# ---------------------------------------------------------
# Gemini client
# ---------------------------------------------------------

def get_gemini_client():
    """
    Create a Gemini client using the API key
    stored in .env.
    """

    if not GEMINI_API_KEY:
        raise RuntimeError(
            "GEMINI_API_KEY is not configured in .env"
        )

    return genai.Client(
        api_key=GEMINI_API_KEY
    )


# ---------------------------------------------------------
# Cutoff-based explanation
# ---------------------------------------------------------

def generate_grounded_explanation(
    cutoff_mark,
    community,
    retrieved_results,
    district=None,
    branch_code=None
):
    """
    Generate a grounded explanation from cutoff-based
    historical evidence.
    """

    client = get_gemini_client()

    evidence = retrieved_results[:20]

    evidence_json = json.dumps(
        evidence,
        indent=2,
        ensure_ascii=False
    )

    prompt = f"""
You are the reasoning assistant for CollegeConnect,
a TNEA college prediction assistant.

Use ONLY the historical evidence supplied below.

Student aggregate cutoff:
{cutoff_mark}

Community:
{community}

District:
{district if district else "All districts"}

Branch:
{branch_code if branch_code else "All branches"}


Retrieved historical evidence:

{evidence_json}


Instructions:

1. Use only the supplied evidence.
2. Do not invent college names.
3. Do not invent cutoff marks.
4. Do not invent closing ranks.
5. Do not invent years.
6. Do not claim guaranteed admission.
7. Explain why the options historically match the
   student's cutoff.
8. Mention relevant historical cutoff and closing
   rank values.
9. Explain the historical-fit information.
10. State that historical matching is not a calibrated
    admission probability.
11. Mention missing data when relevant.
12. Keep the response concise.

Use these headings:

Summary:
Historical Evidence:
How to Interpret:
Limitations:
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return response.text


# ---------------------------------------------------------
# State-rank explanation
# ---------------------------------------------------------

def generate_rank_grounded_explanation(
    state_rank,
    community,
    retrieved_results,
    district=None,
    branch_code=None
):
    """
    Generate a grounded explanation from state-rank
    historical closing-rank evidence.
    """

    client = get_gemini_client()

    evidence = retrieved_results[:20]

    evidence_json = json.dumps(
        evidence,
        indent=2,
        ensure_ascii=False
    )

    prompt = f"""
You are the reasoning assistant for CollegeConnect,
a TNEA college prediction assistant.

Use ONLY the historical evidence supplied below.

Student TNEA state rank:
{state_rank}

Community:
{community}

District:
{district if district else "All districts"}

Branch:
{branch_code if branch_code else "All branches"}


Retrieved historical evidence:

{evidence_json}


Instructions:

1. Use only the supplied evidence.
2. Do not invent college names.
3. Do not invent closing ranks.
4. Do not invent cutoff marks.
5. Do not invent years.
6. Do not claim guaranteed admission.
7. Explain why the options historically match the
   student's state rank.
8. Remember that a lower numerical state rank is
   better than a higher numerical rank.
9. Compare the student's rank against the historical
   closing ranks supplied in the evidence.
10. Mention relevant years and closing ranks.
11. State clearly that historical matching is not a
    calibrated admission probability.
12. Mention missing historical information when relevant.
13. Keep the response concise and suitable for the UI.

Use these headings:

Summary:
Historical Evidence:
How to Interpret:
Limitations:
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return response.text
def generate_combined_grounded_explanation(
    cutoff_mark,
    state_rank,
    community,
    retrieved_results,
    district=None,
    branch_code=None
):
    """
    Generate a grounded explanation when the student
    supplies cutoff, state rank, or both.
    """

    client = get_gemini_client()

    evidence = retrieved_results[:8]

    evidence_json = json.dumps(
        evidence,
        indent=2,
        ensure_ascii=False
    )

    cutoff_text = (
        str(cutoff_mark)
        if cutoff_mark is not None
        else "Not provided"
    )

    rank_text = (
        str(state_rank)
        if state_rank is not None
        else "Not provided"
    )

    prompt = f"""
You are the reasoning assistant for CollegeConnect,
a TNEA college prediction assistant.

Use ONLY the historical evidence supplied below.

Student aggregate cutoff:
{cutoff_text}

Student state rank:
{rank_text}

Community:
{community}

District:
{district if district else "All districts"}

Branch:
{branch_code if branch_code else "All branches"}


RETRIEVED HISTORICAL EVIDENCE

{evidence_json}


INSTRUCTIONS

1. Use only the supplied historical evidence.
2. Do not invent college names.
3. Do not invent cutoff marks.
4. Do not invent closing ranks.
5. Do not invent years.
6. Do not claim guaranteed admission.
7. When both cutoff and state rank are provided,
   explain both pieces of historical evidence.
8. A cutoff match means the student cutoff is greater
   than or equal to the historical cutoff.
9. A rank match means the student state rank is less
   than or equal to the historical closing rank.
10. When both values are supplied, combined historical
    matching requires both conditions to be satisfied
    in years where both historical values exist.
11. If one historical value is missing for a year,
    that year should not be described as a failed
    combined match.
12. Explain the latest available historical cutoff
    and closing rank when present.
13. Explain historical-fit scores as threshold-match
    measures, NOT as admission probabilities.
14. Mention missing historical information when relevant.
15. Keep the response concise.
16. Do not use external knowledge.

Use exactly these headings:

Summary:
Historical Evidence:
How to Interpret:
Limitations:
"""

    response = client.models.generate_content(
        model=GEMINI_MODEL,
        contents=prompt
    )

    if not response.text:
        raise RuntimeError(
            "Gemini returned an empty response."
        )

    return response.text