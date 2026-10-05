# CollegeConnect – Your TNEA College Prediction Assistant
## Comprehensive Project Engineering Plan & Architecture Specification

**Project Context:** Academic Application Development Lab (23N511), Department of Computer Science and Engineering, PSG College of Technology  
**Document Status:** Baseline Architectural Plan (Pre-Implementation)  
**Date:** October 2026  

---

## 1. Executive Summary & Core Constraints

CollegeConnect is an academic web application designed to assist Tamil Nadu Engineering Admissions (TNEA) aspirants in navigating college and branch selections across Tamil Nadu. The system enables students to compute aggregate cutoff scores from board marks or input their official state ranks, evaluates their admission viability across 5 years of historical cutoff and rank datasets (2021–2025), and leverages a Retrieval-Augmented Generation (RAG) pipeline powered by Google Gemini for grounded reasoning, trend explanation, and choice-list optimization.

### Core Directives & Ground Rules
1. **No Logic Duplication from Demo Application:** The existing demo application repository (`TNEA-Cuttoff-Predictor`) is strictly a UI/UX layout and visual reference. Its frontend heuristics, mock JavaScript data (`js/data.js`), client-side probability math (`js/mlEngine.js`), and simulated calculations must **not** be used as backend or prediction logic.
2. **Authoritative Data Source:** The single source of truth is the verified, cleaned 5-year TNEA dataset (2021–2025) comprising **16,174 integrated records**, 467 unique engineering colleges, and 116 branch codes across 7 standard reservation categories (OC, BC, BCM, MBC, SC, SCA, ST).
3. **Database Architecture:** Relational data will be stored and indexed in **MySQL**. Logical entities (`College`, `CutoffRecord`) outlined in the lab report will be translated into a normalized, high-performance physical schema following detailed dataset inspection.
4. **AI/RAG Pipeline:** A Retrieval-Augmented Generation (RAG) architecture using **Google Gemini** will be integrated to provide explainable admissions assessments and contextual counseling recommendations, strictly grounded on retrieved MySQL records to prevent hallucinations.
5. **Incremental Delivery:** The project is executed modularly in discrete phases—from schema design and data ingestion to deterministic retrieval, RAG integration, and responsive frontend dashboard assembly.

---

## 2. Proposed Project Architecture

CollegeConnect follows a decoupled, 5-tier layered architecture designed for separation of concerns, deterministic data accuracy, and transparent AI reasoning.

```
+-----------------------------------------------------------------------------------+
|                            1. USER INTERFACE LAYER                                |
|  - Modern Single-Page Dashboard (Glassmorphism design inspired by demo UI)        |
|  - Cutoff Calculator (Maths, Physics, Chemistry) / State Rank Input Form          |
|  - Multi-Dimensional Filter Controls (Category, Quotas, District, Branch, Tier)   |
|  - Prediction Results Grid with Probability Tiers (Safe / Target / Reach)         |
|  - 5-Year Cutoff Trend Modal (Chart.js / SVG) & Branch Swap Modal                 |
|  - DoTE Choice List Optimizer & Formatter                                         |
|  - State Rank Matrix Reference Table                                              |
+-----------------------------------------+-----------------------------------------+
                                          | JSON over REST APIs
                                          v
+-----------------------------------------------------------------------------------+
|                           2. BACKEND API SERVICE LAYER                            |
|  - HTTP Router & Request Validation (Mark bounds, rank validity, quota enum)      |
|  - Cutoff Normalization Engine (Maths + Physics/2 + Chemistry/2)                  |
|  - API Controller Endpoints (/api/predict, /api/choices, /api/matrix, /api/rag)   |
|  - Response Serializer & Pagination Handler                                       |
+-----------------------------------------+-----------------------------------------+
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        3. RETRIEVAL & QUERY ENGINE LAYER                          |
|  - Parameterized Dynamic SQL Generator                                            |
|  - Multi-Year Historical Aggregator (2021–2025 cutoff and rank matching)          |
|  - Historical Match Rate Calculator (Years qualified / Active recorded years)     |
|  - 5-Year Trajectory & Cutoff Drift Calculator                                    |
|  - Context Assembler for RAG Pipeline                                             |
+--------------------+------------------------------------+-------------------------+
                     |                                    |
                     v                                    v
+------------------------------------+   +------------------------------------------+
|       4. DATABASE LAYER (MySQL)     |   |         5. RAG & AI REASONING LAYER      |
|  - Normalized Relational Tables:   |   |   (Google Gemini Integration)            |
|    * colleges                      |   |  - Grounded Prompt Synthesizer           |
|    * branches                      |   |  - Google Gemini Model Client            |
|    * cutoff_rank_records           |   |  - Deterministic Context Injection       |
|    * quota_matrix                  |   |  - Admission Assessment Explanation Gen  |
|  - Optimized B-Tree Indices:       |   |  - Strategic Choice Justification        |
|    (community, cutoff_mark)        |   |  - Hallucination Guardrails & Fallbacks  |
|    (college_code, branch_code)     |   +------------------------------------------+
+------------------------------------+
```

---

## 3. Major Modules Specification

### Module 1: User Input & Cutoff Calculation Engine
* **Purpose:** Collects, validates, and normalizes candidate credentials.
* **Functional Scope:**
  * Mode A: Academic Marks Entry — Mathematics ($M \in [0, 100]$), Physics ($P \in [0, 100]$), Chemistry ($C \in [0, 100]$) with steps of 0.5.
  * TNEA Cutoff Computation Formula:
    $$\text{TNEA Cutoff} = M + \frac{P}{2} + \frac{C}{2} \quad (\text{Scale: } 0.00 \text{ to } 200.00)$$
  * Mode B: State Rank Entry — Candidate overall TNEA state rank ($R \ge 1$).
  * Input Sanitization: Rejects out-of-range marks, negative values, and non-numeric characters.

### Module 2: TNEA Historical Database & Ingestion Module
* **Purpose:** Manages the relational storage and indexing of official TNEA historical data.
* **Functional Scope:**
  * Ingests the 16,174 integrated records spanning years 2021 through 2025.
  * Preserves data integrity: Handles legitimate missing cutoff/rank values (such as non-allotted ST/SCA seats) as structured SQL `NULL` values rather than arbitrary zeroes.
  * Provides optimized query abstractions for historical lookups by year, college, branch, and community.

### Module 3: Historical Retrieval & Multi-Criteria Filtering Engine
* **Purpose:** Retrieves eligible college-branch opportunities based on student credentials and constraints.
* **Functional Scope:**
  * Cutoff Comparison: $\text{Student Cutoff} \ge \text{Historical Cutoff}$.
  * Rank Comparison: $\text{Student Rank} \le \text{Historical Closing Rank}$.
  * Filter Dimensions:
    * **Community Category:** OC, BC, BCM, MBC, SC, SCA, ST.
    * **7.5% Government School Quota:** Preferential seat reservation filter.
    * **Special Quota:** Differently Abled, Sports Persons, Ex-Servicemen.
    * **Geographic / District:** Single or multi-district filtering (e.g., Chennai, Coimbatore, Madurai).
    * **Engineering Branch:** Specific branch streams (e.g., Computer Science, Mechanical, ECE).
    * **College Selector:** Filter by specific college code or institution name.
    * **Institutional Tier:** Premier (Tier-1), Reputed (Tier-2), Affiliated (Tier-3).

### Module 4: Admission Assessment & Scoring Engine
* **Purpose:** Provides a data-driven historical assessment for each candidate college-branch pair.
* **Functional Scope:**
  * Computes **Historical Match Rate**:
    $$\text{Match Rate} = \frac{\sum_{y \in Y_{\text{active}}} \mathbb{I}(\text{Candidate Qualifies in year } y)}{|Y_{\text{active}}|}$$
  * Probability Classification Tiers:
    * **Safe (>85% historical match / comfortable cutoff cushion):** Student cutoff exceeds past cutoffs by $\ge 2.5$ marks or rank is well within closing bounds.
    * **Target (50% – 85% historical match):** Student cutoff is within $\pm 2.0$ marks of historical average cutoffs.
    * **Reach (<50% historical match / ambitious):** Cutoff is slightly below historical cutoffs (within reach gap $\le 3.0$ marks).
  * Computes 5-year cutoff shift ($\Delta = \text{Cutoff}_{2025} - \text{Cutoff}_{2021}$) and historical trend trajectory (Upward, Stable, Downward).

### Module 5: RAG & Gemini Explanation Engine
* **Purpose:** Delivers natural language explanations, risk justifications, and alternative strategy advice.
* **Functional Scope:**
  * Context Formulation: Constructs compact prompts injecting student scores, top matching colleges, cutoff cushions, and 5-year trends.
  * Grounded Generation: Google Gemini analyzes the retrieved data to explain *why* an option is Safe, Target, or Reach.
  * Smart Campus Branch Swaps: Identifies alternate engineering branches within the same campus if a candidate narrowly misses their primary choice.
  * Strictly bounded: Enforces guardrails so Gemini never invents hypothetical cutoff figures.

### Module 6: DoTE Choice Optimizer Module
* **Purpose:** Generates a strategically balanced preference list for the official DoTE single-window counseling portal.
* **Functional Scope:**
  * Algorithmic Strategy: Suggests a prioritized choice list balancing:
    * 20% Reach / Ambitious choices (Dream institutions)
    * 50% Target choices (Realistic probability)
    * 30% Safe choices (Guaranteed safety nets)
  * Manual List Management: Drag-and-drop or re-order priority rankings.
  * Export Facilities:
    * Formatted text output tailored for direct copy-pasting into the official DoTE portal (`tneaonline.org`).
    * Structured CSV export.

### Module 7: State Rank Matrix Analytical Module
* **Purpose:** Provides an independent empirical reference matrix mapping cutoff bands to state ranks.
* **Functional Scope:**
  * Renders benchmark cutoff brackets (e.g., 199.5–200.0, 198.0–199.49, ..., 110.0–159.99).
  * Displays estimated state rank spreads, student competition density, and typical institutional allotment spectrums.
  * Operates directly on the historical dataset independently of individual student inputs.

### Module 8: Frontend Dashboard & Interactive UI Module
* **Purpose:** Delivers an intuitive, accessible, and high-performance interface.
* **Functional Scope:**
  * Unified single-page responsive layout inspired by modern glassmorphic aesthetics.
  * Real-time reactive updates as marks or filters change.
  * Interactive modal dialogs: 5-year cutoff trend visualization, smart branch swaps, and DoTE export formatter.

---

## 4. End-to-End Data Flow

```
[Candidate Input]
  │  (Marks: Maths, Physics, Chemistry OR State Rank + Category & Quotas)
  ▼
[Input Validation & Normalization]
  │  (Compute Cutoff out of 200.00; validate bounds)
  ▼
[Query Construction & Parameter Binding]
  │  (Build dynamic SQL for community, quotas, districts, branches)
  ▼
[MySQL Database Execution]
  │  (Indexed query against 16,174 records spanning 2021–2025)
  ▼
[Deterministic Scoring Engine]
  │  (Compute Historical Match Rate, Cutoff Delta, Probability Tier)
  ▼
[Context Assembly for RAG Pipeline]
  │  (Extract candidate profile + top retrieved matches & trend metrics)
  ▼
[Google Gemini API Invocation]
  │  (Generate natural language admission rationale & choice strategy)
  ▼
[Payload Serialization & JSON API Response]
  │  (Matches array, summary metrics, RAG narrative, choice optimization)
  ▼
[Frontend Dashboard Rendering]
  │  (Results table, Safe/Target/Reach badges, Chart.js trends, DoTE export)
```

---

## 5. Database Planning (MySQL)

### 5.1 Dataset Characterization & Inspection Findings
The project's authoritative data source is the integrated 5-year dataset (`tnea_integrated_master.csv`) exhibiting the following verified attributes:
* **Record Count:** Exactly 16,174 rows covering academic admission years 2021, 2022, 2023, 2024, and 2025.
* **Institutions & Programs:** 467 unique college codes, 116 unique branch codes across 39 Tamil Nadu revenue districts and 9 college categories (CEG Departments, Government Colleges, Government Aided, Self-Financing, etc.).
* **Category Representation in Source Data:** Source files represent reservation categories as wide columns (`cutoff_oc`, `cutoff_bc`, `cutoff_bcm`, `cutoff_mbc`, `cutoff_sc`, `cutoff_sca`, `cutoff_st` and matching `rank_*` columns).
* **Missing Value Semantics:** Missing entries in categories such as ST or SCA reflect programs where no seats were allotted under that quota for that academic year. They must be maintained as `NULL` to avoid corrupting average and match-rate calculations.

### 5.2 Proposed Relational Schema Design

```
+---------------------------------------------------------------------------------+
|                                 colleges                                        |
+---------------------------------------------------------------------------------+
| college_code     INT             PRIMARY KEY (Official TNEA Code, e.g., 1, 2001)|
| college_name     VARCHAR(255)    NOT NULL                                       |
| district         VARCHAR(100)    NOT NULL (e.g., CHENNAI, COIMBATORE)           |
| college_type     VARCHAR(100)    NOT NULL (e.g., CEG DEPTS, GOVT, SFI)          |
| institutional_tier VARCHAR(20)   NULL (Tier-1, Tier-2, Tier-3)                  |
+---------------------------------------------------------------------------------+
                                      |
                                      | 1
                                      |
                                      | N
+---------------------------------------------------------------------------------+
|                                cutoff_records                                   |
+---------------------------------------------------------------------------------+
| record_id        BIGINT AUTO_INC PRIMARY KEY                                    |
| college_code     INT             FOREIGN KEY -> colleges(college_code)          |
| branch_code      VARCHAR(10)     NOT NULL (e.g., CS, EC, ME, IT)                |
| branch_name      VARCHAR(255)    NOT NULL                                       |
| year             SMALLINT        NOT NULL (2021, 2022, 2023, 2024, 2025)        |
| community        VARCHAR(10)     NOT NULL (OC, BC, BCM, MBC, SC, SCA, ST)       |
| quota_type       VARCHAR(50)     NOT NULL DEFAULT 'GENERAL' (GENERAL, 7.5_GOVT) |
| cutoff_mark      DECIMAL(6,3)    NULL (Recorded cutoff mark out of 200.00)      |
| closing_rank     INT             NULL (Official DoTE closing rank)              |
| is_partial       TINYINT(1)      DEFAULT 0 (Allotment completeness flag)        |
+---------------------------------------------------------------------------------+
```

### 5.3 Database Indexing Strategy
To ensure sub-50ms API response times across dynamic multi-field filtering:
* `idx_community_cutoff`: `(community, quota_type, cutoff_mark)`
* `idx_community_rank`: `(community, quota_type, closing_rank)`
* `idx_lookup_composite`: `(college_code, branch_code, year, community)`
* `idx_district_filter`: `(district)`
* `idx_branch_filter`: `(branch_code)`

### 5.4 Database Decisions Still to be Made
* `[PENDING DECISION]` **Wide vs. Normalized (Tall) Ingestion Format:** Whether to store records in a normalized tall schema (one row per year-college-branch-category, $\sim 113,000$ rows) or keep the wide schema mirroring the CSV ($16,174$ rows with 7 cutoff columns).  
  * *Trade-off:* The tall format simplifies dynamic category filtering and indexing; the wide format simplifies single-query 5-year tabular exports.
* `[PENDING DECISION]` **7.5% Government Quota & Special Quota Source Mapping:** Determine whether 7.5% government school quota and special quotas (sports/ex-servicemen) require separate database tables or dedicated `quota_type` columns after auditing raw government gazette supplements.

---

## 6. RAG (Retrieval-Augmented Generation) & Gemini Planning

### 6.1 Purpose of RAG in CollegeConnect
Unlike generic chatbots or unexplainable black-box machine learning models, CollegeConnect uses Google Gemini specifically to provide **grounded, context-aware reasoning** over actual historical cutoff records retrieved from MySQL.

### 6.2 Three-Stage RAG Execution Flow
1. **Context Retrieval:**
   * SQL queries extract the 5-year cutoff and rank trajectory for colleges matching the student’s profile.
   * Nearest-neighbor records (colleges with closing cutoffs within $\pm 2.0$ marks of the student) are retrieved.
2. **Context Assembly & Grounding:**
   * Context payload structured with explicit facts:
     ```json
     {
       "student_cutoff": 191.00,
       "community": "BC",
       "target_college": "PSG College of Technology (2001)",
       "branch": "Computer Science and Engineering (CS)",
       "history": [
         {"year": 2021, "cutoff": 196.50, "rank": 620},
         {"year": 2022, "cutoff": 197.00, "rank": 580},
         {"year": 2023, "cutoff": 196.75, "rank": 610},
         {"year": 2024, "cutoff": 197.25, "rank": 540},
         {"year": 2025, "cutoff": 197.50, "rank": 510}
       ],
       "gap": -6.50,
       "match_rate": "0/5 years (0%)"
     }
     ```
3. **Generative Assessment via Gemini:**
   * Gemini evaluates the gap and generates:
     * Clear assessment rationale: *“At 191.00, admission to PSG CSE under BC quota is highly ambitious (Reach), as the 5-year cutoff has remained strictly above 196.50.”*
     * Actionable alternative suggestion: *“Consider PSG Robotics & Automation or CIT Coimbatore CSE where BC cutoffs averaged 191.20.”*

### 6.3 Prompt Architecture & Guardrails
* **Anti-Hallucination Directives:** The system prompt strictly prohibits Gemini from quoting cutoff figures not present in the injected context.
* **Deterministic Fallback:** If the Gemini API experiences network timeouts, rate limiting, or service interruptions, the backend automatically falls back to deterministic rule-based explanations without breaking the user experience.
* **Model Selection:** `gemini-1.5-flash` or `gemini-2.0-flash` for high-speed, cost-effective inference suitable for interactive web applications.

---

## 7. Frontend Planning

### 7.1 Visual Layout & UX Design (Inspired by Demo Interface)
The frontend interface will adopt the visual polish and dashboard layout demonstrated in the demo UI, engineered with modern web standards:
* **Theme:** Professional dark glassmorphism theme (`#0f172a` slate palette with cyan `#38bdf8` and indigo `#818cf8` accents).
* **Navigation Header:** Brand logo, title ("CollegeConnect – 2026 TNEA Intelligence"), tab navigators, and PWA manifest support.
* **Main Tab 1: Cutoff & Predictor View:**
  * Top Banner: Dynamic state rank estimation based on Class 12 score distributions.
  * Left Sidebar: Cutoff score calculator (real-time mark inputs), community selector, quota toggles, district/branch filters, and probability tier selectors.
  * Right Main Viewport: Reactive results table showing College Name, Branch, 2025 Cutoff, Admission Probability Badge (Safe/Target/Reach), 5-Year Cutoff Shift, and Action buttons ("Add to Choices", "Trend Chart", "Branch Swap").
* **Main Tab 2: DoTE Choice List Optimizer:**
  * Interactive choice card queue with drag-to-reorder prioritization.
  * Distribution health-check widget (verifying balance between Safe, Target, and Reach choices).
  * Direct DoTE portal copy-paste export modal and CSV download.
* **Main Tab 3: State Rank Matrix:**
  * Full empirical reference table mapping cutoff ranges to historical state rank brackets and competition density.

### 7.2 Frontend Implementation Decisions Still to be Made
* `[PENDING DECISION]` **Frontend Framework Choice:**
  * Option A: Pure Semantic HTML5 + Modern Modular JavaScript (ES6+), preserving the lightweight, dependency-free architecture of the demo reference.
  * Option B: Component-based Single Page App (e.g., React or Vue.js) for advanced reactive state management across complex choice-list interactions.
* `[PENDING DECISION]` **Data Visualization Engine:** Chart.js vs. Lightweight SVG/Canvas for rendering the 5-year cutoff trend lines in modal dialogs.

---

## 8. Implementation Phases (Incremental & Modular)

The project will be developed step-by-step, validating each module before moving to the next:

### Phase 1: Environment Setup & Data Inspection
* Verify Python and MySQL environments.
* Perform detailed structural and exploratory data analysis (EDA) on the 16,174 integrated records in `tnea_integrated_master.csv`.
* Verify column definitions, null value distributions across categories (OC, BC, BCM, MBC, SC, SCA, ST), and category-specific ranges.

### Phase 2: MySQL Schema Design & ETL Ingestion Pipeline
* Formulate final DDL scripts for `colleges`, `branches`, and `cutoff_records`.
* Implement a robust Python ETL script to load, validate, and verify the 16,174 records into MySQL.
* Execute integrity assertions: zero missing keys, exact record counts, verified foreign keys.

### Phase 3: Core Backend & Deterministic Retrieval Engine
* Scaffold the backend application service (Flask or FastAPI).
* Implement the Cutoff Score Calculator ($M + P/2 + C/2$).
* Implement parameter-driven SQL query generators supporting community, quota, district, branch, and institutional tier filters.
* Implement deterministic scoring algorithms (Historical Match Rate, Safe/Target/Reach categorization, 5-year shift calculation).

### Phase 4: State Rank Matrix & Choice Optimizer Logic
* Build the State Rank Matrix service mapping cutoff brackets to empirical rank ranges.
* Build the Choice Optimizer service: algorithmically balancing candidate choices into reach, target, and safe tiers.
* Implement the DoTE portal text formatter and CSV export generators.

### Phase 5: Google Gemini RAG Pipeline Integration
* Implement Google GenAI SDK client integration.
* Construct the prompt template and grounded context injector.
* Implement the explanation generator for college assessments and branch swap recommendations.
* Implement error handling, timeout traps, and deterministic fallback routines.

### Phase 6: Frontend Development & API Binding
* Build the single-page responsive UI layout inspired by the demo reference design.
* Bind UI form controls to backend REST endpoints via asynchronous `fetch` calls.
* Implement dynamic rendering of results, probability badges, and filter updates.
* Implement Chart.js trend line rendering inside modal dialogs.
* Wire up choice list management and DoTE export modals.

### Phase 7: System Integration & End-to-End Hardening
* Complete end-to-end integration across Frontend, Backend, MySQL, and Gemini.
* Conduct cross-browser testing and responsive layout verification (desktop, tablet, mobile).
* Prepare academic demonstration scripts and project documentation.

---

## 9. Testing & Quality Assurance Plan

### 9.1 Unit Testing
* **Cutoff Calculation Tests:** Validate formula accuracy across edge inputs (all zeros, 100/100/100, fractional half-marks, float rounding).
* **Input Validation Tests:** Ensure rejection of negative numbers, marks $>100$, and malformed rank inputs.
* **Scoring Logic Tests:** Verify boundary transitions between Safe ($\ge 85\%$), Target ($50\% - 85\%$), and Reach ($<50\%$) classifications.

### 9.2 Data Integrity & Database Testing
* **Reconciliation Assertions:** Compare SQL queries against raw pandas dataframes to confirm 100% numerical parity across all 16,174 records.
* **Missing Value Handling Tests:** Verify that categories with sparse historical allotments (e.g., ST, SCA) do not crash query aggregators or return distorted zero averages.
* **Query Performance Profiling:** Verify that filtered multi-table join queries execute in under 50 milliseconds using `EXPLAIN ANALYZE`.

### 9.3 RAG & Gemini Verification
* **Grounding & Hallucination Audit:** Evaluate a sample of 50 student cutoff scenarios; verify that all numerical cutoff figures cited by Gemini match the retrieved database rows exactly.
* **Fallback Resilience Testing:** Simulate Gemini API timeouts or invalid API keys; verify that the system seamlessly serves deterministic rule-based explanations without user-visible errors.

### 9.4 User Acceptance & Counseling Scenario Testing
* **Benchmark Profile Validation:** Test with real student profiles representing high scorers ($>195$), competitive scorers ($180–195$), moderate scorers ($150–180$), and vocational/low cutoff ranges ($<150$).
* **Choice List Integrity:** Verify that generated DoTE option lists contain valid college codes, valid branch codes, and conform to official DoTE counseling entry specifications.

---

## 10. Integration Phases

```
Stage 1: Raw Data (16,174 records) ───[Python ETL]───> MySQL Database
Stage 2: MySQL Database ───[SQL Engine]───> Backend Retrieval API
Stage 3: Backend Retrieval API ───[Deterministic Evaluator]───> Scoring & Tiers
Stage 4: Scoring + Context ───[Prompt Injector]───> Google Gemini RAG
Stage 5: Gemini Output + Scores ───[REST API Serializer]───> Frontend UI
```

---

## 11. Technical Risks, Mitigations & Open Questions

| Risk / Open Question | Category | Impact | Proposed Mitigation / Decision Path |
| :--- | :--- | :--- | :--- |
| **Backend Framework Selection** | Architecture | Medium | `[PENDING DECISION]` Choose between **Flask** (lightweight, highly familiar for lab projects, already present in Python env) and **FastAPI** (asynchronous, auto-generating OpenAPI documentation). |
| **Gemini API Quota & Latency** | AI / RAG | High | Network latency or rate limits could slow down real-time search. **Mitigation:** Use RAG asynchronously only when a student clicks for in-depth assessment or modal analysis, while keeping the main search results table 100% deterministic and instantaneous. |
| **Sparse Data in ST / SCA Categories** | Data Quality | Medium | ST cutoff data has $70\%-88\%$ missing values due to non-allotment in specialized branches. **Mitigation:** Retain SQL `NULL` values; compute match rates strictly over years with active allotments; display informative UI tooltips ("No historical allotments under ST quota in recent years"). |
| **7.5% Govt School Quota Representation** | Data Schema | Medium | `[PENDING DECISION]` Verify if the 7.5% preferential quota cutoffs are contained in supplementary files or require schema expansion with a dedicated reservation multiplier flag. |
| **Institutional Tiering Criteria** | Data Schema | Low | `[PENDING DECISION]` Standardize criteria for classifying institutions into Tier-1, Tier-2, and Tier-3 (e.g., NIRF rankings, autonomous status, or 5-year median cutoff averages). |

---

## 12. Verification & Next Steps

This project plan establishes the complete architectural baseline for CollegeConnect. 

**Immediate Next Milestone (Phase 1 & 2):**
1. Review and approve database schema decision (Wide vs. Normalized Tall format).
2. Begin Module 2: MySQL database creation and ETL data ingestion of the 16,174 integrated TNEA records.
