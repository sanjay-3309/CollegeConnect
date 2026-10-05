"""
CollegeConnect Deterministic Historical Probability Scoring

The numerical estimate is calculated from historical TNEA data.
Gemini is NOT used to invent the numerical probability.

Inputs:
    Cutoff mode:
        student cutoff
        2021-2025 historical cutoffs

    Rank mode:
        student state rank
        2021-2025 historical closing ranks

Output:
    estimated_probability
    tier
    probability_reasoning
    scoring_diagnostics

IMPORTANT:
This is an indicative historical estimate, not an official TNEA
probability or admission guarantee.
"""

from __future__ import annotations

import math
from statistics import mean, pstdev
from typing import Any, Optional


# ============================================================================
# CONFIGURATION
# ============================================================================

YEAR_WEIGHTS = {
    2021: 1.00,
    2022: 1.00,
    2023: 1.10,
    2024: 1.25,
    2025: 1.50,
}

# Final student-facing categories.
SAFE_THRESHOLD = 80.0
TARGET_THRESHOLD = 50.0


# ============================================================================
# BASIC HELPERS
# ============================================================================

def safe_float(
    value: Any,
) -> Optional[float]:

    if value is None:
        return None

    try:
        return float(value)

    except (
        TypeError,
        ValueError,
    ):

        return None


def safe_int(
    value: Any,
) -> Optional[int]:

    if value is None:
        return None

    try:
        return int(value)

    except (
        TypeError,
        ValueError,
    ):

        return None


def clamp(
    value: float,
    minimum: float,
    maximum: float,
) -> float:

    return max(
        minimum,
        min(
            maximum,
            value,
        ),
    )


def sigmoid(
    value: float,
) -> float:
    """
    Smoothly converts a margin into a value from 0 to 1.
    """

    value = clamp(
        value,
        -40.0,
        40.0,
    )

    return 1.0 / (
        1.0 +
        math.exp(
            -value
        )
    )


def weighted_average(
    values: list[float],
    weights: list[float],
) -> float:

    if not values:
        return 0.0

    denominator = sum(
        weights
    )

    if denominator <= 0:
        return mean(values)

    return (
        sum(
            value * weight
            for value, weight
            in zip(
                values,
                weights,
            )
        )
        /
        denominator
    )


# ============================================================================
# TIER
# ============================================================================

def probability_to_tier(
    probability: float,
) -> str:

    if probability >= SAFE_THRESHOLD:
        return "Safe"

    if probability >= TARGET_THRESHOLD:
        return "Target"

    return "Reach"


# ============================================================================
# CUTOFF PROBABILITY
# ============================================================================

def calculate_cutoff_probability(
    student_cutoff: float,
    historical_records: list[dict],
) -> tuple[float, dict]:

    observations = []

    for record in historical_records:

        year = safe_int(
            record.get(
                "year"
            )
        )

        cutoff = safe_float(
            record.get(
                "cutoff_mark"
            )
        )

        if (
            year is None
            or cutoff is None
        ):
            continue

        margin = (
            student_cutoff
            -
            cutoff
        )

        weight = YEAR_WEIGHTS.get(
            year,
            1.0,
        )

        observations.append({

            "year":
                year,

            "cutoff":
                cutoff,

            "margin":
                margin,

            "weight":
                weight,

        })


    if not observations:

        return (
            50.0,
            {
                "mode":
                    "cutoff",

                "available_years":
                    0,

                "matched_years":
                    0,

                "match_rate":
                    0.0,

                "average_margin":
                    None,

                "recent_margin":
                    None,

                "margin_std":
                    None,

                "historical_cutoffs":
                    [],
            },
        )


    observations.sort(
        key=lambda item:
            item["year"]
    )


    margins = [
        item["margin"]
        for item in observations
    ]


    weights = [
        item["weight"]
        for item in observations
    ]


    match_flags = [

        1.0
        if item["margin"] >= 0
        else 0.0

        for item in observations

    ]


    matched_years = int(
        sum(
            match_flags
        )
    )


    match_rate = (
        weighted_average(
            match_flags,
            weights,
        )
    )


    average_margin = (
        weighted_average(
            margins,
            weights,
        )
    )


    recent_margin = (
        observations[-1]["margin"]
    )


    margin_std = (
        pstdev(
            margins
        )
        if len(margins) > 1
        else 0.0
    )


    # ------------------------------------------------------------------------
    # The scale determines how many marks are required to make the
    # probability meaningfully increase.
    # ------------------------------------------------------------------------

    margin_scale = max(
        2.5,
        margin_std,
    )


    # ------------------------------------------------------------------------
    # Three historical signals:
    #
    # 45% -> weighted historical match rate
    # 35% -> weighted average margin
    # 20% -> latest-year margin
    #
    # This gives the recent year more importance without allowing it
    # to completely dominate the five-year pattern.
    # ------------------------------------------------------------------------

    margin_signal = sigmoid(
        average_margin /
        margin_scale
    )


    recent_signal = sigmoid(
        recent_margin /
        3.0
    )


    probability = (
        0.45 *
        match_rate
        +
        0.35 *
        margin_signal
        +
        0.20 *
        recent_signal
    ) * 100.0


    # ------------------------------------------------------------------------
    # Small uncertainty penalty for highly unstable historical margins.
    #
    # It is deliberately small.
    # ------------------------------------------------------------------------

    instability = (
        margin_std /
        max(
            margin_scale,
            1.0,
        )
    )


    stability_penalty = min(
        3.0,
        instability * 0.75,
    )


    probability -= (
        stability_penalty
    )


    probability = clamp(
        probability,
        2.0,
        98.0,
    )


    diagnostics = {

        "mode":
            "cutoff",

        "available_years":
            len(observations),

        "matched_years":
            matched_years,

        "match_rate":
            round(
                match_rate * 100.0,
                1,
            ),

        "average_margin":
            round(
                average_margin,
                3,
            ),

        "recent_margin":
            round(
                recent_margin,
                3,
            ),

        "margin_std":
            round(
                margin_std,
                3,
            ),

        "margin_scale":
            round(
                margin_scale,
                3,
            ),

        "historical_cutoffs": [

            {

                "year":
                    item["year"],

                "cutoff":
                    item["cutoff"],

                "margin":
                    round(
                        item["margin"],
                        3,
                    ),

            }

            for item in observations

        ],

    }


    return (
        round(
            probability,
            1,
        ),

        diagnostics,
    )


# ============================================================================
# RANK PROBABILITY
# ============================================================================

def calculate_rank_probability(
    student_rank: int,
    historical_records: list[dict],
) -> tuple[float, dict]:

    observations = []

    for record in historical_records:

        year = safe_int(
            record.get(
                "year"
            )
        )

        closing_rank = safe_int(
            record.get(
                "closing_rank"
            )
        )

        if (
            year is None
            or closing_rank is None
        ):
            continue

        # Positive margin = student's rank is better.
        margin = (
            closing_rank
            -
            student_rank
        )

        weight = YEAR_WEIGHTS.get(
            year,
            1.0,
        )

        observations.append({

            "year":
                year,

            "closing_rank":
                closing_rank,

            "margin":
                margin,

            "weight":
                weight,

        })


    if not observations:

        return (
            50.0,
            {

                "mode":
                    "rank",

                "available_years":
                    0,

                "matched_years":
                    0,

                "match_rate":
                    0.0,

                "average_margin":
                    None,

                "recent_margin":
                    None,

                "margin_std":
                    None,

                "historical_ranks":
                    [],

            },
        )


    observations.sort(
        key=lambda item:
            item["year"]
    )


    margins = [
        item["margin"]
        for item in observations
    ]


    ranks = [
        item["closing_rank"]
        for item in observations
    ]


    weights = [
        item["weight"]
        for item in observations
    ]


    match_flags = [

        1.0
        if item["margin"] >= 0
        else 0.0

        for item in observations

    ]


    matched_years = int(
        sum(
            match_flags
        )
    )


    match_rate = (
        weighted_average(
            match_flags,
            weights,
        )
    )


    average_margin = (
        weighted_average(
            margins,
            weights,
        )
    )


    recent_margin = (
        observations[-1]["margin"]
    )


    margin_std = (
        pstdev(
            margins
        )
        if len(margins) > 1
        else 0.0
    )


    # ------------------------------------------------------------------------
    # Rank scale.
    #
    # We use both the typical closing rank and historical variation so that
    # rank differences are not treated like cutoff marks.
    # ------------------------------------------------------------------------

    typical_rank = (
        mean(
            ranks
        )
    )


    rank_scale = max(
        1000.0,
        typical_rank * 0.08,
        margin_std,
    )


    margin_signal = sigmoid(
        average_margin /
        rank_scale
    )


    recent_signal = sigmoid(
        recent_margin /
        max(
            1000.0,
            rank_scale * 0.75,
        )
    )


    probability = (
        0.45 *
        match_rate
        +
        0.35 *
        margin_signal
        +
        0.20 *
        recent_signal
    ) * 100.0


    instability = (
        margin_std /
        max(
            rank_scale,
            1.0,
        )
    )


    stability_penalty = min(
        3.0,
        instability * 0.75,
    )


    probability -= (
        stability_penalty
    )


    probability = clamp(
        probability,
        2.0,
        98.0,
    )


    diagnostics = {

        "mode":
            "rank",

        "available_years":
            len(observations),

        "matched_years":
            matched_years,

        "match_rate":
            round(
                match_rate * 100.0,
                1,
            ),

        "average_margin":
            round(
                average_margin,
                1,
            ),

        "recent_margin":
            round(
                recent_margin,
                1,
            ),

        "margin_std":
            round(
                margin_std,
                1,
            ),

        "rank_scale":
            round(
                rank_scale,
                1,
            ),

        "historical_ranks": [

            {

                "year":
                    item["year"],

                "closing_rank":
                    item["closing_rank"],

                "margin":
                    round(
                        item["margin"],
                        1,
                    ),

            }

            for item in observations

        ],

    }


    return (
        round(
            probability,
            1,
        ),

        diagnostics,
    )


# ============================================================================
# REASONING
# ============================================================================

def build_reasoning(
    candidate: dict,
    diagnostics: dict,
    student_input: dict,
) -> str:

    college_name = (
        candidate.get(
            "college_name"
        )
        or
        "This college"
    )


    branch_name = (
        candidate.get(
            "branch_name"
        )
        or
        candidate.get(
            "branch_code"
        )
        or
        "this branch"
    )


    available_years = (
        diagnostics.get(
            "available_years",
            0,
        )
    )


    matched_years = (
        diagnostics.get(
            "matched_years",
            0,
        )
    )


    match_rate = (
        diagnostics.get(
            "match_rate",
            0.0,
        )
    )


    average_margin = (
        diagnostics.get(
            "average_margin"
        )
    )


    recent_margin = (
        diagnostics.get(
            "recent_margin"
        )
    )


    probability = float(
        candidate.get(
            "estimated_probability",
            0.0,
        )
        or 0.0
    )


    if diagnostics.get(
        "mode"
    ) == "cutoff":

        cutoff = student_input.get(
            "cutoff_mark"
        )


        if cutoff is None:

            return (
                f"{college_name} – {branch_name} "
                "was evaluated using the available "
                "historical cutoff records."
            )


        if (
            average_margin is not None
            and average_margin >= 0
        ):

            margin_description = (
                "above"
            )

        else:

            margin_description = (
                "below"
            )


        return (

            f"For a student cutoff of "
            f"{cutoff:.1f}, "

            f"{college_name} – {branch_name} "
            f"matched the student's cutoff in "
            f"{matched_years} of "
            f"{available_years} available historical years "
            f"({match_rate:.1f}% weighted historical match rate). "

            f"The weighted average historical margin was "
            f"{average_margin:.3f} marks "
            f"{margin_description} the recorded cutoffs, "

            f"while the latest-year margin was "
            f"{recent_margin:.3f} marks. "

            f"The resulting indicative historical estimate is "
            f"{probability:.1f}%."

        )


    state_rank = student_input.get(
        "state_rank"
    )


    if state_rank is None:

        return (
            f"{college_name} – {branch_name} "
            "was evaluated using the available "
            "historical closing-rank records."
        )


    if (
        average_margin is not None
        and average_margin >= 0
    ):

        rank_description = (
            "better than"
        )

    else:

        rank_description = (
            "weaker than"
        )


    return (

        f"For a student state rank of "
        f"{state_rank}, "

        f"{college_name} – {branch_name} "
        f"matched the historical closing-rank condition "
        f"in {matched_years} of "
        f"{available_years} available years "
        f"({match_rate:.1f}% weighted historical match rate). "

        f"The weighted average rank margin was "
        f"{average_margin:.1f}, meaning the student's rank "
        f"was {rank_description} the historical closing rank "
        f"by that amount on average. "

        f"The latest-year margin was "
        f"{recent_margin:.1f}. "

        f"The resulting indicative historical estimate is "
        f"{probability:.1f}%."

    )


# ============================================================================
# PUBLIC SCORING FUNCTION
# ============================================================================

def generate_probability_scores(
    student_input: dict,
    candidates: list[dict],
) -> list[dict]:

    scored = []


    cutoff_value = (
        student_input.get(
            "cutoff_mark"
        )
    )


    rank_value = (
        student_input.get(
            "state_rank"
        )
    )


    if cutoff_value is not None:

        mode = "cutoff"

    elif rank_value is not None:

        mode = "rank"

    else:

        raise ValueError(
            "Either cutoff_mark or state_rank "
            "must be provided."
        )


    for candidate in candidates:

        history = candidate.get(
            "historical_records",
            [],
        )


        if mode == "cutoff":

            probability, diagnostics = (
                calculate_cutoff_probability(

                    float(
                        cutoff_value
                    ),

                    history,

                )
            )


        else:

            probability, diagnostics = (
                calculate_rank_probability(

                    int(
                        rank_value
                    ),

                    history,

                )
            )


        result = dict(
            candidate
        )


        result[
            "estimated_probability"
        ] = probability


        result[
            "tier"
        ] = probability_to_tier(
            probability
        )


        result[
            "probability_reasoning"
        ] = build_reasoning(

            {

                **result,

                "estimated_probability":
                    probability,

            },

            diagnostics,

            student_input,

        )


        result[
            "scoring_diagnostics"
        ] = diagnostics


        scored.append(
            result
        )


    return scored