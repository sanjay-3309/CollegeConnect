import os
from typing import Any, Optional

import pymysql
from flask import Flask, jsonify, request

try:
    from backend.db import get_db_connection
    from backend.probability_service import attach_probability_scores
except ImportError:
    from db import get_db_connection
    from probability_service import attach_probability_scores


# ============================================================================
# FLASK APP
# ============================================================================

app = Flask(__name__)


# ============================================================================
# CONSTANTS
# ============================================================================

VALID_COMMUNITIES = {
    "OC",
    "BC",
    "BCM",
    "MBC",
    "SC",
    "SCA",
    "ST",
}

DEFAULT_QUOTA = "GENERAL"

DEFAULT_RESULT_LIMIT = 30
MAX_RESULT_LIMIT = 30


# ============================================================================
# GENERAL HELPERS
# ============================================================================

def safe_close(conn: Any) -> None:
    if conn is not None:
        try:
            conn.close()
        except Exception:
            pass


def normalize_optional_text(
    value: Optional[str],
) -> Optional[str]:

    if value is None:
        return None

    value = value.strip()

    return value if value else None


def parse_positive_float(
    value: Optional[str],
    field_name: str,
    maximum: Optional[float] = None,
) -> float:

    if value is None:
        raise ValueError(
            f"{field_name} is required."
        )

    try:
        number = float(value)

    except (
        TypeError,
        ValueError,
    ):

        raise ValueError(
            f"{field_name} must be a valid number."
        )

    if number <= 0:
        raise ValueError(
            f"{field_name} must be greater than zero."
        )

    if (
        maximum is not None
        and number > maximum
    ):

        raise ValueError(
            f"{field_name} must not exceed {maximum}."
        )

    return number


def parse_positive_int(
    value: Optional[str],
    field_name: str,
) -> int:

    if value is None:
        raise ValueError(
            f"{field_name} is required."
        )

    try:
        number = int(value)

    except (
        TypeError,
        ValueError,
    ):

        raise ValueError(
            f"{field_name} must be a valid integer."
        )

    if number <= 0:
        raise ValueError(
            f"{field_name} must be greater than zero."
        )

    return number


def parse_limit(
    value: Optional[str],
) -> int:

    if value is None:
        return DEFAULT_RESULT_LIMIT

    try:
        limit = int(value)

    except (
        TypeError,
        ValueError,
    ):

        raise ValueError(
            "limit must be a valid integer."
        )

    if limit <= 0:
        raise ValueError(
            "limit must be greater than zero."
        )

    return min(
        limit,
        MAX_RESULT_LIMIT,
    )


def validate_community(
    community: str,
) -> str:

    community = (
        community or ""
    ).strip().upper()

    if community not in VALID_COMMUNITIES:

        raise ValueError(
            f"Invalid community '{community}'. "
            f"Allowed values: "
            f"{', '.join(sorted(VALID_COMMUNITIES))}."
        )

    return community


# ============================================================================
# MULTI-VALUE FILTER HELPERS
# ============================================================================

def get_multiple_query_values(
    parameter_name: str,
) -> list[str]:

    """
    Supports both:

        ?district=CHENNAI&district=COIMBATORE

    and:

        ?district=CHENNAI,COIMBATORE
    """

    values = request.args.getlist(
        parameter_name
    )

    output: list[str] = []

    for value in values:

        if value is None:
            continue

        parts = str(value).split(",")

        for part in parts:

            part = part.strip()

            if part:
                output.append(part)

    # Remove duplicates while preserving order.
    seen = set()

    unique_values = []

    for value in output:

        key = value.upper()

        if key in seen:
            continue

        seen.add(key)

        unique_values.append(
            value
        )

    return unique_values


def build_in_clause(
    values: list[Any],
) -> tuple[str, list[Any]]:

    placeholders = ", ".join(
        ["%s"] * len(values)
    )

    return placeholders, list(values)


# ============================================================================
# PROBABILITY HELPERS
# ============================================================================

def probability_value(
    candidate: dict,
) -> float:

    value = candidate.get(
        "estimated_probability"
    )

    if value is None:
        return -1.0

    try:
        return float(value)

    except (
        TypeError,
        ValueError,
    ):

        return -1.0


def select_display_candidates(
    results: list[dict],
    limit: int,
) -> list[dict]:

    """
    Select a representative set across the full probability range.

    We do NOT simply take the top 30 because that can hide lower-probability
    choices.

    We also do NOT force a fixed Reach/Target/Safe count.

    Instead, we take candidates from:
        - high probability range
        - middle probability range
        - low probability range

    Then the candidate keeps its actual probability-derived tier.
    """

    if not results:
        return []

    if len(results) <= limit:
        selected = list(results)

    else:

        ranked = sorted(
            results,
            key=lambda item: (
                -probability_value(item),

                str(
                    item.get(
                        "college_name",
                        "",
                    )
                ),

                str(
                    item.get(
                        "branch_code",
                        "",
                    )
                ),
            ),
        )

        high_count = limit // 3
        middle_count = limit // 3
        low_count = (
            limit
            -
            high_count
            -
            middle_count
        )

        high = ranked[
            :high_count
        ]

        middle_start = max(
            0,
            (
                len(ranked) // 2
            )
            -
            (
                middle_count // 2
            ),
        )

        middle = ranked[
            middle_start:
            middle_start + middle_count
        ]

        low = (
            ranked[
                -low_count:
            ]
            if low_count > 0
            else []
        )

        selected = []

        seen = set()

        for candidate in (
            high
            +
            middle
            +
            low
        ):

            key = (
                str(
                    candidate.get(
                        "college_code",
                        "",
                    )
                ),

                str(
                    candidate.get(
                        "branch_code",
                        "",
                    )
                ),
            )

            if key in seen:
                continue

            seen.add(key)

            selected.append(
                candidate
            )

        # Safety fill.
        if len(selected) < limit:

            for candidate in ranked:

                key = (
                    str(
                        candidate.get(
                            "college_code",
                            "",
                        )
                    ),

                    str(
                        candidate.get(
                            "branch_code",
                            "",
                        )
                    ),
                )

                if key in seen:
                    continue

                seen.add(key)

                selected.append(
                    candidate
                )

                if len(selected) >= limit:
                    break

    # ------------------------------------------------------------------------
    # Student-facing order:
    #
    # Reach
    # Target
    # Safe
    #
    # But probability remains untouched.
    # ------------------------------------------------------------------------

    def tier_order(
        candidate: dict,
    ) -> int:

        tier = str(
            candidate.get(
                "tier",
                "",
            )
        ).title()

        return {
            "Reach": 0,
            "Target": 1,
            "Safe": 2,
        }.get(
            tier,
            1,
        )

    selected.sort(
        key=lambda item: (
            tier_order(item),
            -probability_value(item),
            str(
                item.get(
                    "college_name",
                    "",
                )
            ),
        )
    )

    return selected[
        :limit
    ]


# ============================================================================
# HEALTH
# ============================================================================

@app.route(
    "/api/health",
    methods=["GET"],
)
def health():

    return jsonify({

        "status": "ok",

        "service":
            "CollegeConnect API",

    })


# ============================================================================
# DATABASE TEST
# ============================================================================

@app.route(
    "/api/db-test",
    methods=["GET"],
)
def db_test():

    conn = None

    try:

        conn = get_db_connection()

        with conn.cursor() as cursor:

            cursor.execute(
                "SELECT COUNT(*) FROM colleges;"
            )

            result = cursor.fetchone()

            college_count = (
                result[0]
                if result
                else 0
            )

        return jsonify({

            "status": "ok",

            "database":
                os.getenv(
                    "MYSQL_DATABASE",
                    "collegeconnect",
                ),

            "college_count":
                college_count,

        })

    except pymysql.MySQLError as err:

        return jsonify({

            "status": "error",

            "message":
                f"Database error: {err}",

        }), 500

    except Exception as err:

        return jsonify({

            "status": "error",

            "message":
                f"Unexpected error: {err}",

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# DISTRICTS
# ============================================================================

@app.route(
    "/api/districts",
    methods=["GET"],
)
def districts():

    conn = None

    try:

        conn = get_db_connection()

        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute("""
                SELECT DISTINCT
                    district

                FROM colleges

                WHERE district IS NOT NULL

                  AND TRIM(district) <> ''

                ORDER BY district;
            """)

            rows = cursor.fetchall()

        return jsonify({

            "status": "ok",

            "districts": [
                row["district"]
                for row in rows
            ],

        })

    except Exception as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# BRANCHES
# ============================================================================

@app.route(
    "/api/branches",
    methods=["GET"],
)
def branches():

    conn = None

    try:

        districts_filter = (
            get_multiple_query_values(
                "district"
            )
        )

        conn = get_db_connection()

        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            if districts_filter:

                placeholders, params = (
                    build_in_clause(
                        districts_filter
                    )
                )

                cursor.execute(

                    f"""
                    SELECT DISTINCT

                        b.branch_code,

                        b.branch_name

                    FROM branches b

                    INNER JOIN historical_admissions h

                        ON h.branch_code =
                           b.branch_code

                    INNER JOIN colleges c

                        ON c.college_code =
                           h.college_code

                    WHERE c.district IN (
                        {placeholders}
                    )

                    ORDER BY
                        b.branch_code,
                        b.branch_name;
                    """,

                    params,
                )

            else:

                cursor.execute("""
                    SELECT

                        branch_code,

                        branch_name

                    FROM branches

                    ORDER BY
                        branch_code,
                        branch_name;
                """)

            rows = cursor.fetchall()

        return jsonify({

            "status": "ok",

            "branches":
                rows,

        })

    except Exception as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# COLLEGES
# ============================================================================

@app.route(
    "/api/colleges",
    methods=["GET"],
)
def colleges():

    conn = None

    try:

        districts_filter = (
            get_multiple_query_values(
                "district"
            )
        )

        branches_filter = (
            get_multiple_query_values(
                "branch_code"
            )
        )

        conn = get_db_connection()

        sql = """
            SELECT DISTINCT

                c.college_code,

                c.college_name,

                c.district,

                c.college_type,

                c.institutional_tier

            FROM colleges c

            INNER JOIN historical_admissions h

                ON h.college_code =
                   c.college_code

            WHERE 1 = 1
        """

        params: list[Any] = []

        if districts_filter:

            placeholders, values = (
                build_in_clause(
                    districts_filter
                )
            )

            sql += f"""
                AND c.district IN (
                    {placeholders}
                )
            """

            params.extend(values)

        if branches_filter:

            placeholders, values = (
                build_in_clause(
                    branches_filter
                )
            )

            sql += f"""
                AND h.branch_code IN (
                    {placeholders}
                )
            """

            params.extend(values)

        sql += """
            ORDER BY
                c.college_name,
                c.college_code;
        """

        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute(
                sql,
                params,
            )

            rows = cursor.fetchall()

        return jsonify({

            "status": "ok",

            "colleges":
                rows,

        })

    except Exception as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# HISTORICAL
# ============================================================================

@app.route(
    "/api/historical",
    methods=["GET"],
)
def historical():

    conn = None

    try:

        college_code = parse_positive_int(

            request.args.get(
                "college_code"
            ),

            "college_code",

        )

        branch_code = (
            normalize_optional_text(
                request.args.get(
                    "branch_code"
                )
            )
        )

        if not branch_code:

            raise ValueError(
                "branch_code is required."
            )

        community = validate_community(

            request.args.get(
                "community",
                "OC",
            )

        )

        quota = (
            request.args.get(
                "quota",
                DEFAULT_QUOTA,
            )
            .strip()
            .upper()
        )

        conn = get_db_connection()

        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute("""

                SELECT

                    year,

                    cutoff_mark,

                    closing_rank,

                    is_partial

                FROM historical_admissions

                WHERE college_code = %s

                  AND branch_code = %s

                  AND community = %s

                  AND quota = %s

                ORDER BY year ASC;

            """, (

                college_code,

                branch_code,

                community,

                quota,

            ))

            rows = cursor.fetchall()

        return jsonify({

            "status": "ok",

            "college_code":
                college_code,

            "branch_code":
                branch_code,

            "community":
                community,

            "quota":
                quota,

            "years":
                rows,

        })

    except ValueError as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 400

    except Exception as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# HISTORICAL ANALYSIS
# ============================================================================

@app.route(
    "/api/historical-analysis",
    methods=["GET"],
)
def historical_analysis():

    conn = None

    try:

        college_code = parse_positive_int(

            request.args.get(
                "college_code"
            ),

            "college_code",

        )

        branch_code = (
            normalize_optional_text(
                request.args.get(
                    "branch_code"
                )
            )
        )

        if not branch_code:

            raise ValueError(
                "branch_code is required."
            )

        community = validate_community(

            request.args.get(
                "community",
                "OC",
            )

        )

        quota = (
            request.args.get(
                "quota",
                DEFAULT_QUOTA,
            )
            .strip()
            .upper()
        )

        conn = get_db_connection()

        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute("""

                SELECT

                    COUNT(cutoff_mark)
                        AS available_cutoff_years,

                    AVG(cutoff_mark)
                        AS average_cutoff,

                    MIN(cutoff_mark)
                        AS minimum_cutoff,

                    MAX(cutoff_mark)
                        AS maximum_cutoff,

                    MAX(
                        CASE
                            WHEN year = 2021
                            THEN cutoff_mark
                        END
                    ) AS cutoff_2021,

                    MAX(
                        CASE
                            WHEN year = 2025
                            THEN cutoff_mark
                        END
                    ) AS cutoff_2025,

                    MAX(
                        CASE
                            WHEN year = 2021
                            THEN closing_rank
                        END
                    ) AS rank_2021,

                    MAX(
                        CASE
                            WHEN year = 2025
                            THEN closing_rank
                        END
                    ) AS rank_2025

                FROM historical_admissions

                WHERE college_code = %s

                  AND branch_code = %s

                  AND community = %s

                  AND quota = %s;

            """, (

                college_code,

                branch_code,

                community,

                quota,

            ))

            result = cursor.fetchone()

        return jsonify({

            "status": "ok",

            "college_code":
                college_code,

            "branch_code":
                branch_code,

            "community":
                community,

            "quota":
                quota,

            "analysis":
                result,

        })

    except ValueError as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 400

    except Exception as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 500

    finally:

        safe_close(conn)


# ============================================================================
# CUTOFF PREDICTIONS
# ============================================================================

@app.route(
    "/api/predictions",
    methods=["GET"],
)
def predictions():

    conn = None

    try:

        cutoff_mark = parse_positive_float(

            request.args.get(
                "cutoff_mark"
            ),

            "cutoff_mark",

            maximum=200.0,

        )

        community = validate_community(

            request.args.get(
                "community",
                "OC",
            )

        )

        districts_filter = (
            get_multiple_query_values(
                "district"
            )
        )

        branches_filter = (
            get_multiple_query_values(
                "branch_code"
            )
        )

        college_code_value = (
            normalize_optional_text(
                request.args.get(
                    "college_code"
                )
            )
        )

        college_code = None

        if college_code_value:

            college_code = parse_positive_int(

                college_code_value,

                "college_code",

            )

        quota = (
            request.args.get(
                "quota",
                DEFAULT_QUOTA,
            )
            .strip()
            .upper()
        )

        limit = parse_limit(

            request.args.get(
                "limit"
            )

        )

        conn = get_db_connection()


        # --------------------------------------------------------------------
        # RETRIEVE THE COMPLETE FILTERED CANDIDATE SET
        # --------------------------------------------------------------------

        sql = """

            SELECT

                c.college_code,

                c.college_name,

                c.district,

                c.college_type,

                c.institutional_tier,

                h.branch_code,

                b.branch_name,

                ROUND(

                    (

                        SUM(

                            CASE

                                WHEN h.cutoff_mark IS NOT NULL

                                 AND h.cutoff_mark <= %s

                                THEN 1

                                ELSE 0

                            END

                        )

                        /

                        NULLIF(

                            COUNT(h.cutoff_mark),

                            0

                        )

                    ) * 100,

                    1

                ) AS historical_fit_score,

                SUM(

                    CASE

                        WHEN h.cutoff_mark IS NOT NULL

                        THEN 1

                        ELSE 0

                    END

                ) AS available_years,

                SUM(

                    CASE

                        WHEN h.cutoff_mark IS NOT NULL

                         AND h.cutoff_mark <= %s

                        THEN 1

                        ELSE 0

                    END

                ) AS matched_years,

                MAX(

                    CASE

                        WHEN h.year = 2025

                        THEN h.cutoff_mark

                    END

                ) AS latest_cutoff,

                MAX(

                    CASE

                        WHEN h.year = 2025

                        THEN h.closing_rank

                    END

                ) AS latest_closing_rank,

                ROUND(

                    AVG(h.cutoff_mark),

                    3

                ) AS average_cutoff,

                MIN(h.cutoff_mark)
                    AS minimum_cutoff,

                MAX(h.cutoff_mark)
                    AS maximum_cutoff,

                (

                    MAX(

                        CASE

                            WHEN h.year = 2025

                            THEN h.cutoff_mark

                        END

                    )

                    -

                    MAX(

                        CASE

                            WHEN h.year = 2021

                            THEN h.cutoff_mark

                        END

                    )

                ) AS cutoff_change

            FROM historical_admissions h

            INNER JOIN colleges c

                ON c.college_code =
                   h.college_code

            INNER JOIN branches b

                ON b.branch_code =
                   h.branch_code

            WHERE h.community = %s

              AND h.quota = %s

        """

        params: list[Any] = [

            cutoff_mark,

            cutoff_mark,

            community,

            quota,

        ]


        if districts_filter:

            placeholders, values = (
                build_in_clause(
                    districts_filter
                )
            )

            sql += f"""

                AND c.district IN (

                    {placeholders}

                )

            """

            params.extend(values)


        if branches_filter:

            placeholders, values = (
                build_in_clause(
                    branches_filter
                )
            )

            sql += f"""

                AND h.branch_code IN (

                    {placeholders}

                )

            """

            params.extend(values)


        if college_code is not None:

            sql += """

                AND h.college_code = %s

            """

            params.append(
                college_code
            )


        sql += """

            GROUP BY

                c.college_code,

                c.college_name,

                c.district,

                c.college_type,

                c.institutional_tier,

                h.branch_code,

                b.branch_name

            HAVING COUNT(h.cutoff_mark) > 0

            ORDER BY

                historical_fit_score DESC,

                c.college_name ASC;

        """


        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute(
                sql,
                params,
            )

            all_results =list(
                    cursor.fetchall()
                )


        # --------------------------------------------------------------------
        # DETERMINISTIC PROBABILITY SCORING FOR ALL CANDIDATES
        # --------------------------------------------------------------------

        student_input = {

            "cutoff_mark":
                cutoff_mark,

            "state_rank":
                None,

            "community":
                community,

            "district":
                districts_filter,

            "branch_code":
                branches_filter,

        }


        scored_results, scoring_error = (
            attach_probability_scores(

                conn=conn,

                candidates=
                    all_results,

                community=
                    community,

                student_input=
                    student_input,

                quota=
                    quota,

            )
        )


        # --------------------------------------------------------------------
        # SELECT REPRESENTATIVE DISPLAY RESULTS
        # --------------------------------------------------------------------

        results =select_display_candidates(

                scored_results,

                limit,

            )


        # --------------------------------------------------------------------
        # COUNT ACTUAL DISPLAY TIERS
        # --------------------------------------------------------------------

        result_counts = {

            "Reach": 0,

            "Target": 0,

            "Safe": 0,

        }


        for result in results:

            tier = str(

                result.get(
                    "tier",
                    "",
                )

            ).title()


            if tier in result_counts:

                result_counts[tier] += 1


        return jsonify({

            "status":
                "ok",

            "mode":
                "cutoff",

            "student_input": {

                "cutoff_mark":
                    cutoff_mark,

                "community":
                    community,

                "district":
                    districts_filter,

                "branch_code":
                    branches_filter,

                "college_code":
                    college_code,

                "quota":
                    quota,

            },

            "candidate_pool_size":
                len(all_results),

            "scored_candidate_count":
                len(scored_results),

            "count":
                len(results),

            "result_counts":
                result_counts,

            "predictions":
                results,

            "probability_scoring": {

                "status": (

                    "completed"

                    if scoring_error is None

                    else "partial"

                ),

                "error":
                    scoring_error,

            },

        }), 200


    except ValueError as err:

        return jsonify({

            "status": "error",

            "message": str(err),

        }), 400


    except pymysql.MySQLError as err:

        return jsonify({

            "status": "error",

            "message":
                f"Database error: {err}",

        }), 500


    except Exception as err:

        return jsonify({

            "status": "error",

            "message":
                f"Unexpected error: {err}",

        }), 500


    finally:

        safe_close(conn)


# ============================================================================
# SINGLE COLLEGE PREDICTION
# ============================================================================

@app.route(
    "/api/predict",
    methods=["GET"],
)
def predict():

    conn = None

    try:

        cutoff_mark = parse_positive_float(

            request.args.get(
                "cutoff_mark"
            ),

            "cutoff_mark",

            maximum=200.0,

        )

        college_code = parse_positive_int(

            request.args.get(
                "college_code"
            ),

            "college_code",

        )

        branch_code = (
            normalize_optional_text(

                request.args.get(
                    "branch_code"
                )

            )
        )

        if not branch_code:

            raise ValueError(
                "branch_code is required."
            )

        community = validate_community(

            request.args.get(
                "community",
                "OC",
            )

        )

        quota = (
            request.args.get(
                "quota",
                DEFAULT_QUOTA,
            )
            .strip()
            .upper()
        )

        conn =get_db_connection()


        with conn.cursor(
            pymysql.cursors.DictCursor
        ) as cursor:

            cursor.execute("""

                SELECT

                    c.college_code,

                    c.college_name,

                    c.district,

                    c.college_type,

                    c.institutional_tier,

                    h.branch_code,

                    b.branch_name,

                    ROUND(

                        (

                            SUM(

                                CASE

                                    WHEN h.cutoff_mark IS NOT NULL

                                     AND h.cutoff_mark <= %s

                                    THEN 1

                                    ELSE 0

                                END

                            )

                            /

                            NULLIF(

                                COUNT(h.cutoff_mark),

                                0

                            )

                        ) * 100,

                        1

                    ) AS historical_fit_score,

                    COUNT(h.cutoff_mark)
                        AS available_years,

                    SUM(

                        CASE

                            WHEN h.cutoff_mark IS NOT NULL

                             AND h.cutoff_mark <= %s

                            THEN 1

                            ELSE 0

                        END

                    ) AS matched_years,

                    MAX(

                        CASE

                            WHEN h.year = 2025

                            THEN h.cutoff_mark

                        END

                    ) AS latest_cutoff,

                    MAX(

                        CASE

                            WHEN h.year = 2025

                            THEN h.closing_rank

                        END

                    ) AS latest_closing_rank,

                    ROUND(
                        AVG(h.cutoff_mark),
                        3
                    ) AS average_cutoff,

                    MIN(h.cutoff_mark)
                        AS minimum_cutoff,

                    MAX(h.cutoff_mark)
                        AS maximum_cutoff,

                    (

                        MAX(

                            CASE

                                WHEN h.year = 2025

                                THEN h.cutoff_mark

                            END

                        )

                        -

                        MAX(

                            CASE

                                WHEN h.year = 2021

                                THEN h.cutoff_mark

                            END

                        )

                    ) AS cutoff_change

                FROM historical_admissions h

                INNER JOIN colleges c

                    ON c.college_code =
                       h.college_code

                INNER JOIN branches b

                    ON b.branch_code =
                       h.branch_code

                WHERE h.college_code = %s

                  AND h.branch_code = %s

                  AND h.community = %s

                  AND h.quota = %s

                GROUP BY

                    c.college_code,

                    c.college_name,

                    c.district,

                    c.college_type,

                    c.institutional_tier,

                    h.branch_code,

                    b.branch_name

                HAVING COUNT(h.cutoff_mark) > 0;

            """, (

                cutoff_mark,

                cutoff_mark,

                college_code,

                branch_code,

                community,

                quota,

            ))

            results =list(
                    cursor.fetchall()
                )


        if not results:

            return jsonify({

                "status":
                    "ok",

                "mode":
                    "cutoff",

                "prediction":
                    None,

            }), 200


        student_input = {

            "cutoff_mark":
                cutoff_mark,

            "state_rank":
                None,

            "community":
                community,

            "district":
                None,

            "branch_code":
                [
                    branch_code
                ],

        }


        results, scoring_error = (
            attach_probability_scores(

                conn=conn,

                candidates=
                    results,

                community=
                    community,

                student_input=
                    student_input,

                quota=
                    quota,

            )
        )


        return jsonify({

            "status":
                "ok",

            "mode":
                "cutoff",

            "prediction":
                (
                    results[0]
                    if results
                    else None
                ),

            "probability_scoring": {

                "status": (

                    "completed"

                    if scoring_error is None

                    else "partial"

                ),

                "error":
                    scoring_error,

            },

        }), 200


    except ValueError as err:

        return jsonify({

            "status":
                "error",

            "message":
                str(err),

        }), 400


    except pymysql.MySQLError as err:

        return jsonify({

            "status":
                "error",

            "message":
                f"Database error: {err}",

        }), 500


    except Exception as err:

        return jsonify({

            "status":
                "error",

            "message":
                f"Unexpected error: {err}",

        }), 500


    finally:

        safe_close(conn)


# ============================================================================
# MAIN
# ============================================================================

if __name__ == "__main__":

    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True,

    )