import os

from flask import send_from_directory

from backend.app import app


# ============================================================================
# PROJECT PATHS
# ============================================================================

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.abspath(__file__)
    )
)

FRONTEND_DIR = os.path.join(
    BASE_DIR,
    "frontend",
)


# ============================================================================
# REGISTER OPTIONAL BLUEPRINTS SAFELY
# ============================================================================

def register_blueprint_if_missing(
    module_name,
    blueprint_name,
):
    """
    Import a Blueprint and register it only when it has not already
    been registered on the main Flask application.

    This prevents the duplicate-blueprint error that appeared earlier.
    """

    try:

        module = __import__(
            module_name,
            fromlist=[blueprint_name],
        )

        blueprint = getattr(
            module,
            blueprint_name,
        )

        # Flask stores already-registered blueprints here.
        if blueprint.name not in app.blueprints:

            app.register_blueprint(
                blueprint
            )

            print(
                f"[CollegeConnect] Registered Blueprint: "
                f"{blueprint.name}"
            )

        else:

            print(
                f"[CollegeConnect] Blueprint already registered: "
                f"{blueprint.name}"
            )

        return True

    except Exception as exc:

        print(
            f"[CollegeConnect] Could not register "
            f"{module_name}.{blueprint_name}: {exc}"
        )

        return False


# ============================================================================
# RAG ROUTES
# ============================================================================

register_blueprint_if_missing(
    "backend.rag_routes",
    "rag_bp",
)


register_blueprint_if_missing(
    "backend.rank_rag_routes",
    "rank_rag_bp",
)


# ============================================================================
# FRONTEND
# ============================================================================

@app.route(
    "/",
    methods=["GET"],
)
def index():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html",
    )


@app.route(
    "/assets/<path:filename>",
    methods=["GET"],
)
def assets(filename):

    return send_from_directory(
        FRONTEND_DIR,
        filename,
    )


# ============================================================================
# OPTIONAL FRONTEND FALLBACK
# ============================================================================

@app.route(
    "/index.html",
    methods=["GET"],
)
def index_html():

    return send_from_directory(
        FRONTEND_DIR,
        "index.html",
    )


# ============================================================================
# DEBUG ROUTE LIST
# ============================================================================

@app.route(
    "/api/routes",
    methods=["GET"],
)
def routes():

    route_list = []

    for rule in app.url_map.iter_rules():

        route_list.append({

            "endpoint":
                rule.endpoint,

            "methods":
                sorted(
                    rule.methods
                    -
                    {"HEAD", "OPTIONS"}
                ),

            "path":
                str(rule),

        })


    route_list.sort(
        key=lambda item:
            item["path"]
    )


    return {

        "status":
            "ok",

        "routes":
            route_list,

    }


# ============================================================================
# START SERVER
# ============================================================================

if __name__ == "__main__":

    print()
    print("=" * 70)
    print("COLLEGECONNECT SERVER")
    print("=" * 70)
    print()
    print(
        f"Frontend: {FRONTEND_DIR}"
    )
    print()

    print("Registered RAG routes:")

    for rule in app.url_map.iter_rules():

        path = str(rule)

        if (
            "rag" in path.lower()
            or
            "prediction" in path.lower()
        ):

            print(
                f"  {sorted(rule.methods)} "
                f"{path}"
            )

    print()
    print(
        "Open: http://127.0.0.1:5000"
    )

    print("=" * 70)
    print()


    app.run(

        host="127.0.0.1",

        port=5000,

        debug=True,

    )