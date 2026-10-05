# CollegeConnect – Current Project State & Inspection Report

**Date of Inspection:** October 2, 2026  
**Project Path:** `c:\Users\sanja\Desktop\CollegeConnect`  
**Status:** Post-Database Setup & Data Ingestion (Pre-Application Architecture Phase)

---

## 1. Current File / Folder Structure

The current workspace contains the dataset, database DDL, ingestion pipeline, configuration files, and architectural documentation. No application source code (backend or frontend) has been created yet.

```
CollegeConnect/
│
├── .env                                  # Active environment configuration with local MySQL credentials
├── .env.example                          # Template environment configuration file
├── .gitignore                            # Version control exclusion rules (.env, __pycache__, *.pyc, venv, .vscode)
├── DATABASE_SCHEMA.md                    # Authoritative 3NF normalized / tall MySQL schema specification
├── PROJECT_PLAN.md                       # Comprehensive 5-tier architecture & engineering project plan
│
├── data/
│   └── integrated/
│       └── tnea_integrated_master.csv    # Cleaned, verified 5-year integrated TNEA master dataset (2021–2025)
│
├── database/
│   └── schema.sql                        # Production MySQL DDL script (tables, keys, composite B-tree indexes)
│
└── scripts/
    ├── load_database.py                  # End-to-end Python ETL ingestion and database verification script
    └── __pycache__/
        └── load_database.cpython-314.pyc # Compiled Python bytecode
```

---

## 2. Existing Database Files & Live Database State

### Database Files in Repository
* **`database/schema.sql` (118 lines, 7,654 bytes):**
  * Target RDBMS: MySQL 8.0+ / MariaDB 10.5+ with InnoDB engine and `utf8mb4` character set (`utf8mb4_unicode_ci` collation).
  * Defines normalized Third Normal Form (3NF) relational tables:
    * `colleges`: Master dimensional table for engineering colleges.
    * `branches`: Master dimensional table for academic engineering disciplines.
    * `historical_admissions`: Central tall fact table capturing annual cutoff marks and closing ranks per college-branch-year-community-quota.
  * Enforces primary keys, foreign key constraints with `ON UPDATE CASCADE` / `ON DELETE RESTRICT`, and a unique constraint `uq_historical_slot` on `(college_code, branch_code, year, community, quota)`.
  * Configures multi-column composite B-Tree indexes for sub-50ms candidate query filtering:
    * `idx_comm_quota_year_cutoff` on `(community, quota, year, cutoff_mark)`
    * `idx_comm_quota_year_rank` on `(community, quota, year, closing_rank)`
    * `idx_branch_year` on `(branch_code, year)`
    * `idx_year_lookup` on `(year)`
    * Geographic, type, tier, and name indexes on `colleges`
    * Name index on `branches`

### Live Local MySQL Database State
A live inspection of the local MySQL instance (`localhost:3306`, database: `collegeconnect`) confirms that setup and ingestion have successfully executed and meet all authoritative integrity benchmarks:

| Entity / Metric | Live Count in MySQL | Authoritative Benchmark | Status |
| :--- | :--- | :--- | :--- |
| **Colleges (`colleges`)** | **467** | 467 | Verified Matching |
| **Branches (`branches`)** | **116** | 116 | Verified Matching |
| **Admissions Fact Records (`historical_admissions`)** | **113,218** | 113,218 | Verified Matching |
| **Cutoff Mark Available (`cutoff_mark IS NOT NULL`)** | **60,261** | 60,261 | Verified Matching |
| **Closing Rank Available (`closing_rank IS NOT NULL`)** | **60,244** | 60,244 | Verified Matching |
| **Active Allotments (`cutoff OR rank IS NOT NULL`)** | **60,261** | 60,261 | Verified Matching |
| **Unallotted Category Slots (`both cutoff & rank NULL`)** | **52,957** | 52,957 | Verified Matching |
| **Cutoff Present, Rank NULL (`cutoff_only_count`)** | **17** | 17 | Verified Matching |
| **Rank Present, Cutoff NULL (`rank_only_count`)** | **0** | 0 | Verified Matching |
| **Invalid Quota Count (`quota != 'GENERAL'`)** | **0** | 0 | Verified Matching |
| **Invented Institutional Tiers (`tier IS NOT NULL`)** | **0** | 0 | Verified Matching |

---

## 3. Existing Data Files

* **`data/integrated/tnea_integrated_master.csv` (4,534,749 bytes / ~4.33 MB):**
  * Scope: Consolidated 5-year TNEA admission history covering academic years 2021, 2022, 2023, 2024, and 2025.
  * Row Count: 16,174 offerings (college-branch-year combinations).
  * Column Count: 35 columns:
    * Dimensional metadata: `year`, `college_code`, `college_name`, `district`, `college_type`, `branch_code`, `branch_name`.
    * Cutoff values: `cutoff_oc`, `cutoff_bc`, `cutoff_bcm`, `cutoff_mbc`, `cutoff_sc`, `cutoff_sca`, `cutoff_st`.
    * Cutoff partial flags: `cutoff_oc_partial`, `cutoff_bc_partial`, `cutoff_bcm_partial`, `cutoff_mbc_partial`, `cutoff_sc_partial`, `cutoff_sca_partial`, `cutoff_st_partial`.
    * Closing ranks: `rank_oc`, `rank_bc`, `rank_bcm`, `rank_mbc`, `rank_sc`, `rank_sca`, `rank_st`.
    * Rank partial flags: `rank_oc_partial`, `rank_bc_partial`, `rank_bcm_partial`, `rank_mbc_partial`, `rank_sc_partial`, `rank_sca_partial`, `rank_st_partial`.

---

## 4. Existing Scripts

* **`scripts/load_database.py` (1,073 lines, 44,900 bytes):**
  * Authoritative ETL and verification script executed with Python 3.
  * Features:
    * Environment configuration loading via `.env` parser or `python-dotenv`.
    * CSV schema validation ensuring all 35 required columns exist.
    * Dimensional entity normalization for `colleges` (467) and `branches` (116) using latest observed metadata.
    * Vectorized unpivoting of the 7 communal reservation categories (`OC`, `BC`, `BCM`, `MBC`, `SC`, `SCA`, `ST`) to generate 113,218 tall records.
    * Preservation of explicit SQL `NULL` values for unallotted seats (handling pandas `NaN`).
    * Deterministic audit flag resolution: `is_partial = 1` if either cutoff or rank partial flag is 1.
    * Bulk insertion with configurable batch sizes (default: 5,000) using parameterized SQL queries.
    * Full transactional consistency (ACID) with rollback on error.
    * Embedded 11-point assertion suite verifying exact counts against authoritative dataset benchmarks.
    * CLI flags: `--csv`, `--env-file`, `--batch-size`, and `--dry-run`.
* **Bytecode Cache:** `scripts/__pycache__/load_database.cpython-314.pyc`.

---

## 5. Existing Documentation

* **`PROJECT_PLAN.md` (405 lines, 27,950 bytes):**
  * Outlines the full engineering architecture for CollegeConnect (PSG College of Technology, Lab 23N511).
  * Defines core constraints: no logic duplication from demo repository, single authoritative dataset, tall relational MySQL schema, and Gemini RAG pipeline.
  * Specifies the 5 architectural tiers:
    1. User Interface Layer (Modern dashboard)
    2. Backend API Service Layer (REST controllers)
    3. Retrieval & Query Engine Layer (Deterministic SQL & aggregations)
    4. Database Layer (MySQL)
    5. RAG & AI Reasoning Layer (Google Gemini)
  * Details math formulas for cutoff computation, admission probability classification rules (Safe, Target, Reach), API specifications, milestone roadmaps, and risk mitigation strategies.
* **`DATABASE_SCHEMA.md` (562 lines, 38,124 bytes):**
  * Formal architectural specification for the 3NF tall schema design.
  * Comprehensive documentation of tables, keys, nullability semantics, indexing strategy, data volume estimations, ingestion normalization choices, and benchmark verification queries.
* **`.env.example` (10 lines, 326 bytes):**
  * Reference template for configuring local database connection parameters (`MYSQL_HOST`, `MYSQL_PORT`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`).
* **`.env` (6 lines, 110 bytes):**
  * Local instance environment configuration (excluded by `.gitignore`).

---

## 6. Current Python Dependencies

The host Python environment is **Python 3.14.4**. The currently installed relevant packages in the environment are:

* **Database Drivers & ORMs:**
  * `PyMySQL` (1.2.3)
  * `SQLAlchemy` (2.0.51)
  * `alembic` (1.18.5)
  * `Flask-SQLAlchemy` (3.1.1)
  * `Flask-Migrate` (4.1.0)
* **Web & API Frameworks:**
  * `Flask` (3.1.3)
  * `Werkzeug` (3.1.8)
  * `Jinja2` (3.1.6)
  * `streamlit` (1.56.0)
* **Data Processing & Analytics:**
  * `pandas` (3.0.2)
  * `numpy` (2.4.4)
  * `pyarrow` (23.0.1)
  * `scipy` (1.17.1)
  * `scikit-learn` (1.8.0)
* **HTTP, Web Scraping & Utilities:**
  * `requests` (2.33.1)
  * `urllib3` (2.6.3)
  * `beautifulsoup4` (4.15.0)
  * `tqdm` (4.67.3)
  * `click` (8.3.2)
  * `colorama` (0.4.6)
* **Version Control & Configuration:**
  * `GitPython` (3.1.46)
  * `attrs` (26.1.0)
  * `jsonschema` (4.26.0)

### Observations:
* No formal `requirements.txt` or `pyproject.toml` file exists within the project directory yet.
* Gemini SDK dependencies (such as `google-genai` or `google-generativeai`) and `python-dotenv` are not yet frozen in a project-specific requirements file.

---

## 7. Missing Folders Needed for Upcoming Phases

To transition from the data/database phase into application development, the following directory structures must be established in subsequent phases:

### A. Backend (`backend/`)
* Purpose: Houses the REST API service, query engine, and cutoff calculation logic.
* Missing structure:
  * `backend/`
    * `config.py` (configuration and DB connection pooling)
    * `models/` (SQLAlchemy / database model abstractions)
    * `services/` (cutoff calculation, SQL retrieval query builder, probability tier calculator)
    * `routes/` or `api/` (API endpoints: `/api/predict`, `/api/colleges`, `/api/branches`, `/api/choices`, `/api/matrix`)
    * `utils/` (validators, input sanitizers, response serializers)
    * `app.py` / `wsgi.py` (application entry point)

### B. Frontend (`frontend/`)
* Purpose: User interface, dashboard, filters, responsive cutoff calculator, prediction cards, charts, and modal dialogs.
* Missing structure:
  * `frontend/` (or `static/` and `templates/` if serving server-rendered templates via Flask)
    * `src/` (or `css/`, `js/`, `assets/`)
    * `components/` (Input panel, prediction results grid, choice optimizer list, trend modals)
    * `styles/` (Glassmorphism layout stylesheets, responsive rules)

### C. RAG Pipeline (`backend/rag/` or `rag/`)
* Purpose: AI-powered counseling guidance, admission assessment explanations, and choice-list justifications using Google Gemini.
* Missing structure:
  * `backend/rag/` (or `rag/`)
    * `gemini_client.py` (Gemini API integration, token handling, error handling)
    * `prompts/` (Prompt templates: strategic explanation, risk assessment, choice list reasoning)
    * `context_builder.py` (Extracts retrieved SQL facts and structures deterministic prompt context)
    * `guardrails.py` (Hallucination detection, schema grounding verification, output schema enforcement)

### D. Tests (`tests/`)
* Purpose: Automated test suites for mathematical engines, queries, APIs, and RAG grounding.
* Missing structure:
  * `tests/`
    * `unit/` (tests for cutoff mark math: $M + P/2 + C/2$, rank validation, probability classification)
    * `integration/` (tests for MySQL database queries, composite index utilization, REST API endpoints)
    * `rag/` (tests for context formatting, grounding validation, prompt synthesis)

---

## 8. Confirmation: MySQL Database Access Architecture

* **Confirmation:** The MySQL database `collegeconnect` is an **external/local relational database service** running on the host system (`localhost:3306`) and managed independently (e.g., via MySQL Server daemon / MySQL Workbench).
* **Architectural Rule:** The database **must only be accessed through the backend service layer** via parameterized queries / ORM connections.
* **Security & Isolation Guardrail:** Neither the browser frontend nor any client-side JavaScript will communicate directly with MySQL. All data retrieval, filtering, cutoff calculations, and RAG context building will occur server-side within the backend API.

---

## 9. Confirmation: Demo Repository Boundary & Ground Rules

* **Confirmation:** The repository `TNEA-Cuttoff-Predictor` (located externally at `c:\Users\sanja\Desktop\TNEA-Cuttoff-Predictor`) is strictly a **UI/UX visual and layout reference**.
* **Prohibition on Application Logic:**
  * Its mock client-side datasets (`js/data.js`), client-side prediction heuristics (`js/mlEngine.js`), and simulated calculation scripts **must not** be imported, adapted, or executed as CollegeConnect backend or prediction logic.
  * CollegeConnect derives all predictions, cutoff analysis, and choice suggestions deterministically from the authoritative 5-year MySQL database (113,218 tall admission records) and the Google Gemini RAG pipeline.
  * Visual styling patterns (glassmorphism cards, responsive navigation, color-coded badges for Safe/Target/Reach, and modal dialog structures) may be referenced for frontend UI development only.

---

*Report generated and validated autonomously against project repository and database state.*
