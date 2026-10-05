"""
Combined prediction routes for CollegeConnect.

Supports:
- cutoff only
- state rank only
- cutoff + state rank together

When both are supplied:
A historical year is counted as a combined match only when
both the historical cutoff and historical closing rank exist
and both conditions are satisfied.

Missing values are excluded from the combined denominator.
They are not treated as failed matches.
"""

from collections import defaultdict

import pymysql
from flask import Blueprint, jsonify, request

from backend.db import get_db_connection
from backend.rag import generate_combined_grounded_explanation


combined_bp = Blueprint("combined", __name__)


ALLOWED_COMMUNITIES = {
    "OC",
    "BC",
    "BCM",
    "MBC",
    "SC",
    "SCA",
    "ST"
}


def validate_community(value):
    if not value:
        return None

    value = value.upper()

    if value not in ALLOWED_COMMUNITIES:
        return None

    return value


def get_change(values):
    """
    Calculate latest-available minus earliest-available value.
    """
    if len(values) < 2:
        return None

    values = sorted(
        values,
        key=lambda item: item["year"]
    )

    return round(
        values[-1]["value"] - values[0]["value"],
        3
    )


def build_candidate_history(rows):
    """
    Group database rows by college + branch.
    """

    grouped = defaultdict(
        lambda: {
            "college_code": None,
            "college_name": None,
            "district": None,
            "college_type": None,
            "branch_code": None,
            "branch_name": None,
            "history": []
        }
    )

    for row in rows:

        key = (
            row[0],
            row[4]
        )

        candidate = grouped[key]

        candidate["college_code"] = row[0]
        candidate["college_name"] = row[1]
        candidate["district"] = row[2]
        candidate["college_type"] = row[3]
        candidate["branch_code"] = row[4]
        candidate["branch_name"] = row[5]

        candidate["history"].append({
            "year": row[6],
            "cutoff_mark": (
                float(row[7])
                if row[7] is not None
                else None
            ),
            "closing_rank": (
                int(row[8])
                if row[8] is not None
                else None
            ),
            "is_partial": bool(row[9])
        })

    return list(grouped.values())


def calculate_candidate_metrics(
    candidate,
    cutoff_mark=None,
    state_rank=None
):
    """
    Calculate cutoff, rank, or combined historical metrics
    for one college/branch candidate.
    """

    history = sorted(
        candidate["history"],
        key=lambda item: item["year"]
    )

    cutoff_records = [
        item
        for item in history
        if item["cutoff_mark"] is not None
    ]

    rank_records = [
        item
        for item in history
        if item["closing_rank"] is not None
    ]

    combined_records = [
        item
        for item in history
        if (
            item["cutoff_mark"] is not None
            and item["closing_rank"] is not None
        )
    ]

    cutoff_matches = []

    rank_matches = []

    combined_matches = []

    if cutoff_mark is not None:

        cutoff_matches = [
            item
            for item in cutoff_records
            if cutoff_mark >= item["cutoff_mark"]
        ]

    if state_rank is not None:

        rank_matches = [
            item
            for item in rank_records
            if state_rank <= item["closing_rank"]
        ]

    if (
        cutoff_mark is not None
        and state_rank is not None
    ):

        combined_matches = [
            item
            for item in combined_records
            if (
                cutoff_mark >= item["cutoff_mark"]
                and state_rank <= item["closing_rank"]
            )
        ]

    cutoff_score = None

    if cutoff_records and cutoff_mark is not None:

        cutoff_score = round(
            (
                len(cutoff_matches)
                / len(cutoff_records)
            ) * 100,
            2
        )

    rank_score = None

    if rank_records and state_rank is not None:

        rank_score = round(
            (
                len(rank_matches)
                / len(rank_records)
            ) * 100,
            2
        )

    combined_score = None

    if (
        cutoff_mark is not None
        and state_rank is not None
        and combined_records
    ):

        combined_score = round(
            (
                len(combined_matches)
                / len(combined_records)
            ) * 100,
            2
        )

    # Latest cutoff available
    latest_cutoff_record = (
        cutoff_records[-1]
        if cutoff_records
        else None
    )

    # Latest closing rank available
    latest_rank_record = (
        rank_records[-1]
        if rank_records
        else None
    )

    cutoff_values = [
        {
            "year": item["year"],
            "value": item["cutoff_mark"]
        }
        for item in cutoff_records
    ]

    rank_values = [
        {
            "year": item["year"],
            "value": item["closing_rank"]
        }
        for item in rank_records
    ]

    cutoff_change = get_change(
        cutoff_values
    )

    rank_change = get_change(
        rank_values
    )

    # Determine which score is the primary score.
    if (
        cutoff_mark is not None
        and state_rank is not None
    ):

        selected_score = combined_score
        selected_mode = "combined"

        matched_years = len(
            combined_matches
        )

        available_years = len(
            combined_records
        )

    elif cutoff_mark is not None:

        selected_score = cutoff_score
        selected_mode = "cutoff"

        matched_years = len(
            cutoff_matches
        )

        available_years = len(
            cutoff_records
        )

    else:

        selected_score = rank_score
        selected_mode = "rank"

        matched_years = len(
            rank_matches
        )

        available_years = len(
            rank_records
        )

    latest_year = history[-1]["year"] if history else None

    return {
        "historical_fit_score":
            selected_score,

        "fit_mode":
            selected_mode,

        "cutoff_fit_score":
            cutoff_score,

        "rank_fit_score":
            rank_score,

        "combined_fit_score":
            combined_score,

        "matched_years":
            matched_years,

        "available_years":
            available_years,

        "cutoff_matched_years":
            len(cutoff_matches),

        "cutoff_available_years":
            len(cutoff_records),

        "rank_matched_years":
            len(rank_matches),

        "rank_available_years":
            len(rank_records),

        "combined_matched_years":
            len(combined_matches),

        "combined_available_years":
            len(combined_records),

        "latest_year":
            latest_year,

        "latest_cutoff":
            (
                latest_cutoff_record["cutoff_mark"]
                if latest_cutoff_record
                else None
            ),

        "latest_cutoff_year":
            (
                latest_cutoff_record["year"]
                if latest_cutoff_record
                else None
            ),

        "latest_closing_rank":
            (
                latest_rank_record["closing_rank"]
                if latest_rank_record
                else None
            ),

        "latest_closing_rank_year":
            (
                latest_rank_record["year"]
                if latest_rank_record
                else None
            ),

        "cutoff_change":
            cutoff_change,

        "rank_change":
            rank_change
    }


# =========================================================
# Combined Prediction API
# =========================================================

@combined_bp.route(
    "/api/combined-predictions",
    methods=["GET"]
)
def combined_predictions():

    conn = None

    try:

        cutoff_value = request.args.get(
            "cutoff_mark"
        )

        rank_value = request.args.get(
            "state_rank"
        )

        community = request.args.get(
            "community"
        )

        district = request.args.get(
            "district"
        )

        branch_code = request.args.get(
            "branch_code"
        )

        quota = request.args.get(
            "quota",
            "GENERAL"
        )

        limit_value = request.args.get(
            "limit",
            "100"
        )

        # -------------------------------------------------
        # At least one input is required.
        # -------------------------------------------------

        if (
            cutoff_value is None
            and rank_value is None
        ):
            return jsonify({
                "status": "error",
                "message": (
                    "Provide at least one of "
                    "cutoff_mark or state_rank"
                )
            }), 400

        # -------------------------------------------------
        # Parse cutoff
        # -------------------------------------------------

        cutoff_mark = None

        if cutoff_value is not None:

            try:
                cutoff_mark = float(
                    cutoff_value
                )
            except ValueError:

                return jsonify({
                    "status": "error",
                    "message":
                        "cutoff_mark must be a number"
                }), 400

            if not 0 <= cutoff_mark <= 200:

                return jsonify({
                    "status": "error",
                    "message": (
                        "cutoff_mark must be "
                        "between 0 and 200"
                    )
                }), 400

        # -------------------------------------------------
        # Parse state rank
        # -------------------------------------------------

        state_rank = None

        if rank_value is not None:

            try:
                state_rank = int(
                    rank_value
                )
            except ValueError:

                return jsonify({
                    "status": "error",
                    "message":
                        "state_rank must be a whole number"
                }), 400

            if state_rank <= 0:

                return jsonify({
                    "status": "error",
                    "message":
                        "state_rank must be greater than 0"
                }), 400

        # -------------------------------------------------
        # Community
        # -------------------------------------------------

        community = validate_community(
            community
        )

        if community is None:

            return jsonify({
                "status": "error",
                "message": (
                    "Invalid community. "
                    "Allowed values: "
                    "OC, BC, BCM, MBC, SC, SCA, ST"
                )
            }), 400

        # -------------------------------------------------
        # Limit
        # -------------------------------------------------

        try:
            limit = int(
                limit_value
            )
        except ValueError:

            return jsonify({
                "status": "error",
                "message":
                    "limit must be a whole number"
            }), 400

        if limit <= 0:

            return jsonify({
                "status": "error",
                "message":
                    "limit must be greater than 0"
            }), 400

        limit = min(
            limit,
            200
        )

        # -------------------------------------------------
        # Database query
        # -------------------------------------------------

        conn = get_db_connection()

        query = """
            SELECT
                c.college_code,
                c.college_name,
                c.district,
                c.college_type,
                b.branch_code,
                b.branch_name,
                h.year,
                h.cutoff_mark,
                h.closing_rank,
                h.is_partial
            FROM historical_admissions h
            JOIN colleges c
                ON h.college_code = c.college_code
            JOIN branches b
                ON h.branch_code = b.branch_code
            WHERE h.community = %s
              AND h.quota = %s
              AND h.year BETWEEN 2021 AND 2025
        """

        params = [
            community,
            quota
        ]

        if district:

            query += """
                AND c.district = %s
            """

            params.append(
                district
            )

        if branch_code:

            query += """
                AND b.branch_code = %s
            """

            params.append(
                branch_code
            )

        query += """
            ORDER BY
                c.college_code,
                b.branch_code,
                h.year
        """

        with conn.cursor() as cursor:

            cursor.execute(
                query,
                params
            )

            rows = cursor.fetchall()

        # -------------------------------------------------
        # Group records
        # -------------------------------------------------

        candidates = build_candidate_history(
            rows
        )

        results = []

        for candidate in candidates:

            metrics = calculate_candidate_metrics(
                candidate,
                cutoff_mark=cutoff_mark,
                state_rank=state_rank
            )

            # Only return candidates with at least
            # one matching historical year.
            if (
                metrics["historical_fit_score"]
                is None
                or metrics["matched_years"] == 0
            ):
                continue

            result = {

                "college_code":
                    candidate["college_code"],

                "college_name":
                    candidate["college_name"],

                "district":
                    candidate["district"],

                "college_type":
                    candidate["college_type"],

                "branch_code":
                    candidate["branch_code"],

                "branch_name":
                    candidate["branch_name"]

            }

            result.update(
                metrics
            )

            results.append(
                result
            )

        # -------------------------------------------------
        # Sort
        # -------------------------------------------------

        results.sort(
            key=lambda item: (
                -(
                    item["historical_fit_score"]
                    if item["historical_fit_score"]
                    is not None
                    else -1
                ),

                -(
                    item["latest_cutoff"]
                    if item["latest_cutoff"]
                    is not None
                    else 0
                ),

                item["college_code"],

                item["branch_code"]
            )
        )

        results = results[:limit]

        # -------------------------------------------------
        # Response
        # -------------------------------------------------

        if (
            cutoff_mark is not None
            and state_rank is not None
        ):

            mode = "combined"

            basis = (
                "Combined historical comparison using "
                "cutoff and closing rank across 2021-2025. "
                "Only years containing both historical "
                "values contribute to the combined score."
            )

        elif cutoff_mark is not None:

            mode = "cutoff"

            basis = (
                "Historical cutoff comparison "
                "across 2021-2025."
            )

        else:

            mode = "rank"

            basis = (
                "Historical closing-rank comparison "
                "across 2021-2025."
            )

        return jsonify({

            "status": "ok",

            "input": {
                "cutoff_mark":
                    cutoff_mark,

                "state_rank":
                    state_rank,

                "community":
                    community,

                "district":
                    district,

                "branch_code":
                    branch_code,

                "quota":
                    quota
            },

            "mode":
                mode,

            "count":
                len(results),

            "prediction_basis":
                basis,

            "results":
                results,

            "note": (
                "Historical-fit values are threshold "
                "matching measures, not calibrated "
                "admission probabilities."
            )

        }), 200

    except pymysql.MySQLError as err:

        return jsonify({
            "status": "error",
            "message":
                f"Database error: {str(err)}"
        }), 500

    except Exception as err:

        return jsonify({
            "status": "error",
            "message":
                f"Prediction error: {str(err)}"
        }), 500

    finally:

        if conn:
            conn.close()


# =========================================================
# Combined RAG API
# =========================================================

@combined_bp.route(
    "/api/combined-rag-explanation",
    methods=["GET"]
)
def combined_rag_explanation():

    conn = None

    try:

        cutoff_value = request.args.get(
            "cutoff_mark"
        )

        rank_value = request.args.get(
            "state_rank"
        )

        community = request.args.get(
            "community"
        )

        district = request.args.get(
            "district"
        )

        branch_code = request.args.get(
            "branch_code"
        )

        # -------------------------------------------------
        # Parse inputs
        # -------------------------------------------------

        if (
            cutoff_value is None
            and rank_value is None
        ):

            return jsonify({
                "status": "error",
                "message": (
                    "Provide at least one of "
                    "cutoff_mark or state_rank"
                )
            }), 400

        cutoff_mark = None

        if cutoff_value is not None:

            try:
                cutoff_mark = float(
                    cutoff_value
                )
            except ValueError:

                return jsonify({
                    "status": "error",
                    "message":
                        "cutoff_mark must be a number"
                }), 400

            if not 0 <= cutoff_mark <= 200:

                return jsonify({
                    "status": "error",
                    "message": (
                        "cutoff_mark must be "
                        "between 0 and 200"
                    )
                }), 400

        state_rank = None

        if rank_value is not None:

            try:
                state_rank = int(
                    rank_value
                )
            except ValueError:

                return jsonify({
                    "status": "error",
                    "message":
                        "state_rank must be a whole number"
                }), 400

            if state_rank <= 0:

                return jsonify({
                    "status": "error",
                    "message":
                        "state_rank must be greater than 0"
                }), 400

        community = validate_community(
            community
        )

        if community is None:

            return jsonify({
                "status": "error",
                "message": (
                    "Invalid community. "
                    "Allowed values: "
                    "OC, BC, BCM, MBC, SC, SCA, ST"
                )
            }), 400

        # -------------------------------------------------
        # Retrieve historical data
        # -------------------------------------------------

        conn = get_db_connection()

        query = """
            SELECT
                c.college_code,
                c.college_name,
                c.district,
                c.college_type,
                b.branch_code,
                b.branch_name,
                h.year,
                h.cutoff_mark,
                h.closing_rank,
                h.is_partial
            FROM historical_admissions h
            JOIN colleges c
                ON h.college_code = c.college_code
            JOIN branches b
                ON h.branch_code = b.branch_code
            WHERE h.community = %s
              AND h.quota = 'GENERAL'
              AND h.year BETWEEN 2021 AND 2025
        """

        params = [
            community
        ]

        if district:

            query += """
                AND c.district = %s
            """

            params.append(
                district
            )

        if branch_code:

            query += """
                AND b.branch_code = %s
            """

            params.append(
                branch_code
            )

        query += """
            ORDER BY
                c.college_code,
                b.branch_code,
                h.year
        """

        with conn.cursor() as cursor:

            cursor.execute(
                query,
                params
            )

            rows = cursor.fetchall()

        candidates = build_candidate_history(
            rows
        )

        evidence_candidates = []

        for candidate in candidates:

            metrics = calculate_candidate_metrics(
                candidate,
                cutoff_mark=cutoff_mark,
                state_rank=state_rank
            )

            if (
                metrics["historical_fit_score"]
                is None
                or metrics["matched_years"] == 0
            ):
                continue

            evidence_candidates.append({
                **candidate,
                **metrics
            })

        evidence_candidates.sort(
            key=lambda item: (
                -item["historical_fit_score"],
                item["college_code"],
                item["branch_code"]
            )
        )

        evidence_candidates = (
            evidence_candidates[:8]
        )

        if not evidence_candidates:

            return jsonify({
                "status": "ok",
                "retrieved_count": 0,
                "retrieved_evidence": [],
                "explanation": (
                    "No matching historical evidence "
                    "was found for the supplied inputs."
                )
            }), 200

        # -------------------------------------------------
        # Prepare RAG evidence
        # -------------------------------------------------

        evidence = []

        for item in evidence_candidates:

            evidence.append({

                "college_code":
                    item["college_code"],

                "college_name":
                    item["college_name"],

                "district":
                    item["district"],

                "college_type":
                    item["college_type"],

                "branch_code":
                    item["branch_code"],

                "branch_name":
                    item["branch_name"],

                "historical_fit_score":
                    item["historical_fit_score"],

                "cutoff_fit_score":
                    item["cutoff_fit_score"],

                "rank_fit_score":
                    item["rank_fit_score"],

                "combined_fit_score":
                    item["combined_fit_score"],

                "matched_years":
                    item["matched_years"],

                "available_years":
                    item["available_years"],

                "combined_matched_years":
                    item["combined_matched_years"],

                "combined_available_years":
                    item["combined_available_years"],

                "latest_cutoff":
                    item["latest_cutoff"],

                "latest_closing_rank":
                    item["latest_closing_rank"],

                "cutoff_change":
                    item["cutoff_change"],

                "rank_change":
                    item["rank_change"],

                "historical_records":
                    item["history"]
            })

        # -------------------------------------------------
        # Gemini
        # -------------------------------------------------

        explanation = (
            generate_combined_grounded_explanation(
                cutoff_mark=cutoff_mark,
                state_rank=state_rank,
                community=community,
                retrieved_results=evidence,
                district=district,
                branch_code=branch_code
            )
        )

        # -------------------------------------------------
        # Response
        # -------------------------------------------------

        return jsonify({

            "status":
                "ok",

            "input": {

                "cutoff_mark":
                    cutoff_mark,

                "state_rank":
                    state_rank,

                "community":
                    community,

                "district":
                    district,

                "branch_code":
                    branch_code
            },

            "retrieved_count":
                len(evidence),

            "retrieved_evidence":
                evidence,

            "generation_model":
                "Gemini",

            "explanation":
                explanation,

            "note": (
                "The AI explanation is grounded in "
                "historical CollegeConnect data. "
                "Historical matching is not a guarantee "
                "of admission or a calibrated probability."
            )

        }), 200

    except pymysql.MySQLError as err:

        return jsonify({
            "status": "error",
            "message":
                f"Database error: {str(err)}"
        }), 500

    except Exception as err:

        return jsonify({
            "status": "error",
            "message":
                f"RAG generation error: {str(err)}"
        }), 500

    finally:

        if conn:
            conn.close()