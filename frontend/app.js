/* =========================================================
   COLLEGECONNECT FRONTEND
   ========================================================= */

let allDistricts = [];
let allBranches = [];
let allColleges = [];

let selectedDistricts = [];
let selectedBranches = [];
let selectedCollege = null;

let latestResults = [];
let latestPredictionData = null;
let activeResultFilter = "ALL";

let choices = loadSavedChoices();

let aiSuggestedChoices = [];

let draggedChoiceIndex = null;
let draggedAIChoiceIndex = null;

/* =========================================================
   HELPERS / DOM
========================================================= */

function byId(id) {
    return document.getElementById(id);
}

const navTabs =
    document.querySelectorAll(".nav-tab");

const predictorTab =
    byId("predictorTab");

const optimizerTab =
    byId("optimizerTab");

const matrixTab =
    byId("matrixTab");

const predictionForm =
    byId("predictionForm");

const cutoffInput =
    byId("cutoffMark");

const stateRankInput =
    byId("stateRank");

const communitySelect =
    byId("community");

const clearButton =
    byId("clearButton");

const districtSearch =
    byId("districtSearch");

const districtSearchButton =
    byId("districtSearchButton");

const districtOptions =
    byId("districtOptions");

const selectedDistrictsContainer =
    byId("selectedDistricts");

const districtCount =
    byId("districtCount");

const clearDistrictsButton =
    byId("clearDistricts");

const branchSearch =
    byId("branchSearch");

const branchSearchButton =
    byId("branchSearchButton");

const branchOptions =
    byId("branchOptions");

const selectedBranchesContainer =
    byId("selectedBranches");

const branchCount =
    byId("branchCount");

const clearBranchesButton =
    byId("clearBranches");

const collegeSearch =
    byId("collegeSearch");

const collegeSearchButton =
    byId("collegeSearchButton");

const collegeSuggestions =
    byId("collegeSuggestions");

const collegeSelectedDisplay =
    byId("collegeSelectedDisplay");

const loading =
    byId("loading");

const errorMessage =
    byId("errorMessage");

const resultsSection =
    byId("resultsSection");

const resultsSummary =
    byId("resultsSummary");

const resultCount =
    byId("resultCount");

const resultDistribution =
    byId("resultDistribution");

const resultsList =
    byId("resultsList");

const resultFilterButtons =
    document.querySelectorAll(
        ".result-filter-btn"
    );

const ragSection =
    byId("ragSection");

const ragLoading =
    byId("ragLoading");

const ragError =
    byId("ragError");

const ragContent =
    byId("ragContent");

const ragModelBadge =
    byId("ragModelBadge");

const ragSubtitle =
    byId("ragSubtitle");

const openOptimizerButton =
    byId("openOptimizerButton");

const emptyChoices =
    byId("emptyChoices");

const choicesContainer =
    byId("choicesContainer");

const exportButton =
    byId("exportButton");

const clearChoicesButton =
    byId("clearChoicesButton");

const matrixCommunity =
    byId("matrixCommunity");

const matrixDistrict =
    byId("matrixDistrict");

const matrixBranch =
    byId("matrixBranch");

const loadMatrixButton =
    byId("loadMatrixButton");

const matrixLoading =
    byId("matrixLoading");

const matrixError =
    byId("matrixError");

const matrixSection =
    byId("matrixSection");

const matrixTableBody =
    byId("matrixTableBody");

/* =========================================================
   INITIALIZATION
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    async () => {

        createOptimizerControls();

        renderDistrictPicker();

        renderBranchPicker();

        renderCollegeSuggestions();

        renderSelectedCollege();

        renderChoices();

        await loadDistricts();

        renderDistrictPicker();

        await loadBranches();

        renderBranchPicker();

        await loadColleges();

        renderCollegeSuggestions();

        await loadMatrixDistricts();

        await loadMatrixBranches();

        renderChoices();

        renderAISuggestedList();

    }
);

/* =========================================================
   NAVIGATION
========================================================= */

navTabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                const target =
                    tab.dataset.tab;

                navTabs.forEach(
                    item => {

                        item.classList.remove(
                            "active"
                        );

                    }
                );

                tab.classList.add(
                    "active"
                );

                predictorTab.classList.remove(
                    "active"
                );

                optimizerTab.classList.remove(
                    "active"
                );

                matrixTab.classList.remove(
                    "active"
                );

                if (
                    target ===
                    "predictor"
                ) {

                    predictorTab.classList.add(
                        "active"
                    );

                }

                if (
                    target ===
                    "optimizer"
                ) {

                    optimizerTab.classList.add(
                        "active"
                    );

                    renderChoices();

                    renderAISuggestedList();

                }

                if (
                    target ===
                    "matrix"
                ) {

                    matrixTab.classList.add(
                        "active"
                    );

                }

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });

            }
        );

    }
);

/* =========================================================
   QUERY PARAMETER HELPER
========================================================= */

function appendMultipleParams(
    params,
    name,
    values
) {

    if (
        !Array.isArray(
            values
        )
    ) {

        return;

    }

    values.forEach(
        value => {

            if (
                value !== null &&
                value !== undefined &&
                String(
                    value
                ).trim() !== ""
            ) {

                params.append(
                    name,
                    String(
                        value
                    )
                );

            }

        }
    );

}

/* =========================================================
   DISTRICTS
========================================================= */

async function loadDistricts() {

    try {

        const response =
            await fetch(
                "/api/districts"
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            throw new Error(
                data.message ||
                "Failed to load districts."
            );

        }

        allDistricts =
            Array.isArray(
                data.districts
            )
                ? data.districts
                : [];

    } catch (
        error
    ) {

        showError(
            "Could not load districts: " +
            error.message
        );

    }

}

function renderDistrictPicker() {

    if (
        !districtOptions
    ) {

        return;

    }

    const query =
        districtSearch
            ? districtSearch.value
                .trim()
                .toLowerCase()
            : "";

    const filtered =
        allDistricts.filter(
            district =>
                String(
                    district
                )
                    .toLowerCase()
                    .includes(
                        query
                    )
        );

    districtOptions.innerHTML =
        "";

    if (
        filtered.length ===
        0
    ) {

        districtOptions.innerHTML = `
            <div class="picker-empty">
                No districts found.
            </div>
        `;

    } else {

        filtered.forEach(
            district => {

                const row =
                    document.createElement(
                        "div"
                    );

                const isSelected =
                    selectedDistricts.includes(
                        district
                    );

                row.className =
                    "picker-option" +
                    (
                        isSelected
                            ? " selected"
                            : ""
                    );

                row.innerHTML = `
                    <span class="picker-check"></span>

                    <span>
                        ${escapeHtml(
                            district
                        )}
                    </span>
                `;

                row.addEventListener(
                    "click",
                    async () => {

                        toggleDistrict(
                            district
                        );

                        renderDistrictPicker();

                        await loadBranches();

                        renderBranchPicker();

                        await loadColleges();

                        renderCollegeSuggestions();

                    }
                );

                districtOptions.appendChild(
                    row
                );

            }
        );

    }

    renderDistrictChips();

}

function toggleDistrict(
    district
) {

    const index =
        selectedDistricts.indexOf(
            district
        );

    if (
        index >= 0
    ) {

        selectedDistricts.splice(
            index,
            1
        );

    } else {

        selectedDistricts.push(
            district
        );

    }

}

function renderDistrictChips() {

    if (
        !selectedDistrictsContainer
    ) {

        return;

    }

    selectedDistrictsContainer.innerHTML =
        "";

    if (
        selectedDistricts.length ===
        0
    ) {

        districtCount.textContent =
            "No districts selected";

        return;

    }

    districtCount.textContent =
        `${selectedDistricts.length} district${
            selectedDistricts.length ===
            1
                ? ""
                : "s"
        } selected`;

    selectedDistricts.forEach(
        district => {

            const chip =
                document.createElement(
                    "div"
                );

            chip.className =
                "selected-chip";

            chip.innerHTML = `
                <span>
                    ${escapeHtml(
                        district
                    )}
                </span>

                <button
                    type="button"
                    aria-label="Remove district"
                >
                    ×
                </button>
            `;

            chip
                .querySelector(
                    "button"
                )
                .addEventListener(
                    "click",
                    async () => {

                        selectedDistricts =
                            selectedDistricts.filter(
                                item =>
                                    item !==
                                    district
                            );

                        renderDistrictPicker();

                        await loadBranches();

                        renderBranchPicker();

                        await loadColleges();

                        renderCollegeSuggestions();

                    }
                );

            selectedDistrictsContainer
                .appendChild(
                    chip
                );

        }
    );

}

districtSearch?.addEventListener(
    "input",
    () => {

        renderDistrictPicker();

    }
);

districtSearchButton?.addEventListener(
    "click",
    () => {

        renderDistrictPicker();

    }
);

clearDistrictsButton?.addEventListener(
    "click",
    async () => {

        selectedDistricts =
            [];

        renderDistrictPicker();

        await loadBranches();

        renderBranchPicker();

        await loadColleges();

        renderCollegeSuggestions();

    }
);

/* =========================================================
   BRANCHES
========================================================= */

async function loadBranches() {

    try {

        const params =
            new URLSearchParams();

        appendMultipleParams(
            params,
            "district",
            selectedDistricts
        );

        const query =
            params.toString();

        const url =
            query
                ? `/api/branches?${query}`
                : "/api/branches";

        const response =
            await fetch(
                url
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            throw new Error(
                data.message ||
                "Failed to load branches."
            );

        }

        allBranches =
            Array.isArray(
                data.branches
            )
                ? data.branches
                : [];

        const available =
            new Set(
                allBranches.map(
                    branch =>
                        String(
                            branch.branch_code
                        )
                )
            );

        selectedBranches =
            selectedBranches.filter(
                code =>
                    available.has(
                        String(
                            code
                        )
                    )
            );

    } catch (
        error
    ) {

        showError(
            "Could not load branches: " +
            error.message
        );

    }

}

function renderBranchPicker() {

    if (
        !branchOptions
    ) {

        return;

    }

    const query =
        branchSearch
            ? branchSearch.value
                .trim()
                .toLowerCase()
            : "";

    const filtered =
        allBranches.filter(
            branch => {

                const text =
                    `${branch.branch_code} ${branch.branch_name}`
                        .toLowerCase();

                return text.includes(
                    query
                );

            }
        );

    branchOptions.innerHTML =
        "";

    if (
        filtered.length ===
        0
    ) {

        branchOptions.innerHTML = `
            <div class="picker-empty">
                No branches / courses found.
            </div>
        `;

    } else {

        filtered.forEach(
            branch => {

                const code =
                    String(
                        branch.branch_code
                    );

                const isSelected =
                    selectedBranches.some(
                        value =>
                            String(
                                value
                            ) ===
                            code
                    );

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "picker-option" +
                    (
                        isSelected
                            ? " selected"
                            : ""
                    );

                row.innerHTML = `
                    <span class="picker-check"></span>

                    <span>
                        ${escapeHtml(
                            code
                        )}
                        -
                        ${escapeHtml(
                            branch.branch_name
                        )}
                    </span>
                `;

                row.addEventListener(
                    "click",
                    async () => {

                        toggleBranch(
                            code
                        );

                        renderBranchPicker();

                        await loadColleges();

                        renderCollegeSuggestions();

                    }
                );

                branchOptions.appendChild(
                    row
                );

            }
        );

    }

    renderBranchChips();

}

function toggleBranch(
    branchCode
) {

    const normalized =
        String(
            branchCode
        );

    const index =
        selectedBranches.findIndex(
            value =>
                String(
                    value
                ) ===
                normalized
        );

    if (
        index >= 0
    ) {

        selectedBranches.splice(
            index,
            1
        );

    } else {

        selectedBranches.push(
            normalized
        );

    }

}

function renderBranchChips() {

    if (
        !selectedBranchesContainer
    ) {

        return;

    }

    selectedBranchesContainer.innerHTML =
        "";

    if (
        selectedBranches.length ===
        0
    ) {

        branchCount.textContent =
            "No branches selected";

        return;

    }

    branchCount.textContent =
        `${selectedBranches.length} branch${
            selectedBranches.length ===
            1
                ? ""
                : "es"
        } selected`;

    selectedBranches.forEach(
        branchCode => {

            const branch =
                allBranches.find(
                    item =>
                        String(
                            item.branch_code
                        ) ===
                        String(
                            branchCode
                        )
                );

            const label =
                branch
                    ? `${branch.branch_code} - ${branch.branch_name}`
                    : String(
                        branchCode
                    );

            const chip =
                document.createElement(
                    "div"
                );

            chip.className =
                "selected-chip";

            chip.innerHTML = `
                <span>
                    ${escapeHtml(
                        label
                    )}
                </span>

                <button
                    type="button"
                    aria-label="Remove branch"
                >
                    ×
                </button>
            `;

            chip
                .querySelector(
                    "button"
                )
                .addEventListener(
                    "click",
                    async () => {

                        selectedBranches =
                            selectedBranches.filter(
                                value =>
                                    String(
                                        value
                                    ) !==
                                    String(
                                        branchCode
                                    )
                            );

                        renderBranchPicker();

                        await loadColleges();

                        renderCollegeSuggestions();

                    }
                );

            selectedBranchesContainer
                .appendChild(
                    chip
                );

        }
    );

}

branchSearch?.addEventListener(
    "input",
    () => {

        renderBranchPicker();

    }
);

branchSearchButton?.addEventListener(
    "click",
    () => {

        renderBranchPicker();

    }
);

clearBranchesButton?.addEventListener(
    "click",
    async () => {

        selectedBranches =
            [];

        renderBranchPicker();

        await loadColleges();

        renderCollegeSuggestions();

    }
);

/* =========================================================
   COLLEGES
========================================================= */

async function loadColleges() {

    try {

        const params =
            new URLSearchParams();

        appendMultipleParams(
            params,
            "district",
            selectedDistricts
        );

        appendMultipleParams(
            params,
            "branch_code",
            selectedBranches
        );

        const query =
            params.toString();

        const url =
            query
                ? `/api/colleges?${query}`
                : "/api/colleges";

        const response =
            await fetch(
                url
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            throw new Error(
                data.message ||
                "Failed to load colleges."
            );

        }

        allColleges =
            Array.isArray(
                data.colleges
            )
                ? data.colleges
                : [];

        if (
            selectedCollege
        ) {

            const available =
                allColleges.some(
                    college =>
                        String(
                            college.college_code
                        ) ===
                        String(
                            selectedCollege.college_code
                        )
                );

            if (
                !available
            ) {

                selectedCollege =
                    null;

                renderSelectedCollege();

            }

        }

    } catch (
        error
    ) {

        showError(
            "Could not load colleges: " +
            error.message
        );

    }

}

function renderCollegeSuggestions() {

    if (
        !collegeSuggestions ||
        !collegeSearch
    ) {

        return;

    }

    const query =
        collegeSearch.value
            .trim()
            .toLowerCase();

    const filtered =
        allColleges
            .filter(
                college => {

                    const text =
                        `${college.college_code} ${college.college_name} ${college.district}`
                            .toLowerCase();

                    return text.includes(
                        query
                    );

                }
            )
            .slice(
                0,
                80
            );

    collegeSuggestions.innerHTML =
        "";

    if (
        filtered.length ===
        0
    ) {

        collegeSuggestions.innerHTML = `
            <div class="college-suggestion">
                <div class="college-suggestion-meta">
                    No colleges found.
                </div>
            </div>
        `;

    } else {

        filtered.forEach(
            college => {

                const row =
                    document.createElement(
                        "div"
                    );

                row.className =
                    "college-suggestion";

                row.innerHTML = `
                    <div class="college-suggestion-name">
                        ${escapeHtml(
                            college.college_name
                        )}
                    </div>

                    <div class="college-suggestion-meta">
                        Code:
                        ${escapeHtml(
                            String(
                                college.college_code
                            )
                        )}

                        ·

                        ${escapeHtml(
                            college.district ||
                            "Unknown District"
                        )}
                    </div>
                `;

                row.addEventListener(
                    "click",
                    () => {

                        selectedCollege = {

                            college_code:
                                college.college_code,

                            college_name:
                                college.college_name,

                            district:
                                college.district

                        };

                        collegeSearch.value =
                            college.college_name;

                        renderSelectedCollege();

                        hideCollegeSuggestions();

                    }
                );

                collegeSuggestions
                    .appendChild(
                        row
                    );

            }
        );

    }

    if (
        query
    ) {

        collegeSuggestions.classList.remove(
            "hidden"
        );

    }

}

function renderSelectedCollege() {

    if (
        !collegeSelectedDisplay
    ) {

        return;

    }

    if (
        !selectedCollege
    ) {

        collegeSelectedDisplay.classList.add(
            "hidden"
        );

        collegeSelectedDisplay.innerHTML =
            "";

        return;

    }

    collegeSelectedDisplay.classList.remove(
        "hidden"
    );

    collegeSelectedDisplay.innerHTML = `
        <span>

            Selected:

            <strong>
                ${escapeHtml(
                    selectedCollege.college_name
                )}
            </strong>

            ·

            ${escapeHtml(
                String(
                    selectedCollege.college_code
                )
            )}

        </span>

        <button
            id="removeSelectedCollege"
            type="button"
            aria-label="Remove selected college"
        >
            ×
        </button>
    `;

    byId(
        "removeSelectedCollege"
    )?.addEventListener(
        "click",
        () => {

            selectedCollege =
                null;

            collegeSearch.value =
                "";

            renderSelectedCollege();

            renderCollegeSuggestions();

        }
    );

}

function hideCollegeSuggestions() {

    collegeSuggestions?.classList.add(
        "hidden"
    );

}

collegeSearch?.addEventListener(
    "input",
    () => {

        renderCollegeSuggestions();

    }
);

collegeSearchButton?.addEventListener(
    "click",
    () => {

        renderCollegeSuggestions();

        collegeSuggestions.classList.remove(
            "hidden"
        );

    }
);

document.addEventListener(
    "click",
    event => {

        if (
            !event.target.closest(
                ".college-search-box"
            )
        ) {

            hideCollegeSuggestions();

        }

    }
);

/* =========================================================
   PREDICTION FORM
========================================================= */

predictionForm.addEventListener(
    "submit",
    async event => {

        event.preventDefault();

        hideError();

        hideRagError();

        const cutoffText =
            cutoffInput.value.trim();

        const rankText =
            stateRankInput.value.trim();

        const community =
            communitySelect.value;

        if (
            !cutoffText &&
            !rankText
        ) {

            showError(
                "Please enter either your cutoff mark or your state rank."
            );

            return;

        }

        if (
            cutoffText &&
            rankText
        ) {

            showError(
                "Please enter either Cutoff Mark or State Rank, not both."
            );

            return;

        }

        if (
            !community
        ) {

            showError(
                "Please select your community."
            );

            return;

        }

        if (
            cutoffText
        ) {

            const cutoff =
                Number(
                    cutoffText
                );

            if (
                !Number.isFinite(
                    cutoff
                ) ||
                cutoff <= 0 ||
                cutoff > 200
            ) {

                showError(
                    "Cutoff mark must be greater than 0 and at most 200."
                );

                return;

            }

            await runPrediction(
                "cutoff",
                {

                    cutoffMark:
                        cutoff,

                    community:
                        community,

                    districts:
                        [
                            ...selectedDistricts
                        ],

                    branches:
                        [
                            ...selectedBranches
                        ],

                    collegeCode:
                        selectedCollege
                            ? selectedCollege.college_code
                            : null

                }
            );

            return;

        }

        const rank =
            Number(
                rankText
            );

        if (
            !Number.isInteger(
                rank
            ) ||
            rank <= 0
        ) {

            showError(
                "State rank must be a positive whole number."
            );

            return;

        }

        await runPrediction(
            "rank",
            {

                stateRank:
                    rank,

                community:
                    community,

                districts:
                    [
                        ...selectedDistricts
                    ],

                branches:
                    [
                        ...selectedBranches
                    ],

                collegeCode:
                    selectedCollege
                        ? selectedCollege.college_code
                        : null

            }
        );

    }
);

/* =========================================================
   RUN PREDICTION
========================================================= */

async function runPrediction(
    mode,
    input
) {

    setLoading(
        true
    );

    resultsSection.classList.add(
        "hidden"
    );

    ragSection.classList.add(
        "hidden"
    );

    hideError();

    hideRagError();

    try {

        const params =
            new URLSearchParams();

        if (
            mode ===
            "cutoff"
        ) {

            params.set(
                "cutoff_mark",
                input.cutoffMark
            );

        } else {

            params.set(
                "state_rank",
                input.stateRank
            );

        }

        params.set(
            "community",
            input.community
        );

        appendMultipleParams(
            params,
            "district",
            input.districts
        );

        appendMultipleParams(
            params,
            "branch_code",
            input.branches
        );

        if (
            input.collegeCode
        ) {

            params.set(
                "college_code",
                input.collegeCode
            );

        }

        params.set(
            "limit",
            "30"
        );

        const endpoint =
            mode ===
            "cutoff"
                ? "/api/predictions"
                : "/api/rank-predictions";

        const response =
            await fetch(
                `${endpoint}?${params.toString()}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            throw new Error(
                data.message ||
                "Prediction request failed."
            );

        }

        latestPredictionData =
            data;

        latestResults =
            Array.isArray(
                data.predictions
            )
                ? data.predictions
                : [];

        generateAISuggestedList();

        activeResultFilter =
            "ALL";

        updateResultFilterButtons(
            "ALL"
        );

        renderResults(
            data
        );

        await loadRagExplanation(
            mode,
            input
        );

    } catch (
        error
    ) {

        showError(
            error.message ||
            "Prediction request failed."
        );

    } finally {

        setLoading(
            false
        );

    }

}

/* =========================================================
   RESULTS
========================================================= */

function renderResults(
    data
) {

    const mode =
        data.mode ||
        "cutoff";

    const input =
        data.student_input ||
        {};

    const counts =
        data.result_counts ||
        calculateDisplayedCounts(
            latestResults
        );

    const filtered =
        getFilteredResults();

    let summary =
        "";

    if (
        mode ===
        "cutoff"
    ) {

        summary =
            `Historical options for cutoff ${
                input.cutoff_mark ??
                "—"
            } and community ${
                input.community ??
                "—"
            }.`;

    } else {

        summary =
            `Historical options for state rank ${
                input.state_rank ??
                "—"
            } and community ${
                input.community ??
                "—"
            }.`;

    }

    const districts =
        Array.isArray(
            input.district
        )
            ? input.district
            : [];

    const branches =
        Array.isArray(
            input.branch_code
        )
            ? input.branch_code
            : [];

    if (
        districts.length >
        0
    ) {

        summary +=
            ` Districts: ${
                districts.join(
                    ", "
                )
            }.`;

    }

    if (
        branches.length >
        0
    ) {

        summary +=
            ` Branches: ${
                branches.join(
                    ", "
                )
            }.`;

    }

    if (
        input.college_code
    ) {

        summary +=
            ` Specific college selected: ${
                input.college_code
            }.`;

    }

    summary +=
        ` Showing ${
            latestResults.length
        } relevant option${
            latestResults.length ===
            1
                ? ""
                : "s"
        }.`;

    resultsSummary.textContent =
        summary;

    resultCount.textContent =
        `${
            filtered.length
        } option${
            filtered.length ===
            1
                ? ""
                : "s"
        }`;

    resultDistribution.innerHTML = `
        <span class="
            distribution-pill
            distribution-safe
        ">
            🛡 Safe:
            ${counts.Safe ?? 0}
        </span>

        <span class="
            distribution-pill
            distribution-target
        ">
            🎯 Target:
            ${counts.Target ?? 0}
        </span>

        <span class="
            distribution-pill
            distribution-reach
        ">
            🔥 Reach:
            ${counts.Reach ?? 0}
        </span>
    `;

    resultsList.innerHTML =
        "";

    if (
        filtered.length ===
        0
    ) {

        resultsList.innerHTML = `
            <div class="no-results">
                No results in this category.

                <br><br>

                Select
                <strong>All</strong>
                or another category.
            </div>
        `;

        resultsSection.classList.remove(
            "hidden"
        );

        return;

    }

    filtered.forEach(
        result => {

            resultsList.appendChild(
                createResultCard(
                    result
                )
            );

        }
    );

    resultsSection.classList.remove(
        "hidden"
    );

}

function calculateDisplayedCounts(
    results
) {

    const counts = {

        Reach:
            0,

        Target:
            0,

        Safe:
            0

    };

    results.forEach(
        result => {

            const tier =
                normalizeTier(
                    result.tier
                );

            if (
                tier
            ) {

                counts[
                    tier
                ] +=
                    1;

            }

        }
    );

    return counts;

}

function getFilteredResults() {

    if (
        activeResultFilter ===
        "ALL"
    ) {

        return [
            ...latestResults
        ];

    }

    return latestResults.filter(
        result =>
            normalizeTier(
                result.tier
            ) ===
            activeResultFilter
    );

}

function normalizeTier(
    tier
) {

    if (
        tier ===
            null ||
        tier ===
            undefined
    ) {

        return null;

    }

    const value =
        String(
            tier
        )
            .trim()
            .toLowerCase();

    if (
        value ===
        "safe"
    ) {

        return "Safe";

    }

    if (
        value ===
        "target"
    ) {

        return "Target";

    }

    if (
        value ===
        "reach"
    ) {

        return "Reach";

    }

    return null;

}

resultFilterButtons.forEach(
    button => {

        button.addEventListener(
            "click",
            () => {

                activeResultFilter =
                    button.dataset
                        .resultFilter;

                updateResultFilterButtons(
                    activeResultFilter
                );

                if (
                    latestPredictionData
                ) {

                    renderResults(
                        latestPredictionData
                    );

                }

            }
        );

    }
);

function updateResultFilterButtons(
    filter
) {

    resultFilterButtons.forEach(
        button => {

            button.classList.toggle(
                "active",
                button.dataset
                    .resultFilter ===
                    filter
            );

        }
    );

}

/* =========================================================
   RESULT CARD
========================================================= */

function createResultCard(
    result
) {

    const card =
        document.createElement(
            "article"
        );

    card.className =
        "result-card";

    const probabilityValue =
        result.estimated_probability;

    let probabilityText =
        "—";

    if (
        probabilityValue !==
            null &&
        probabilityValue !==
            undefined &&
        Number.isFinite(
            Number(
                probabilityValue
            )
        )
    ) {

        probabilityText =
            `${Number(
                probabilityValue
            ).toFixed(
                1
            )}%`;

    }

    const tier =
        normalizeTier(
            result.tier
        ) ||
        "Target";

    const tierClass =
        tier.toLowerCase();

    const reasoning =
        result.probability_reasoning ||
        "Historical scoring explanation is not available.";

    const historicalFit =
        result.historical_fit_score ??
        "—";

    const latestCutoff =
        result.latest_cutoff ??
        "—";

    const latestRank =
        result.latest_closing_rank ??
        "—";

    const years =
        result.available_years ??
        "—";

    const mode =
        latestPredictionData?.mode ||
        "cutoff";

    const changeValue =
        mode ===
        "cutoff"
            ? result.cutoff_change
            : result.rank_change;

    let changeText =
        "—";

    if (
        changeValue !==
            null &&
        changeValue !==
            undefined
    ) {

        changeText =
            `${
                Number(
                    changeValue
                ) > 0
                    ? "+"
                    : ""
            }${
                changeValue
            }`;

    }

    card.innerHTML = `

        <div class="result-card-header">

            <div>

                <div class="result-college-name">

                    ${escapeHtml(
                        result.college_name ||
                        "Unknown College"
                    )}

                </div>

                <div class="result-branch">

                    ${escapeHtml(
                        result.branch_name ||
                        result.branch_code ||
                        "Unknown Branch"
                    )}

                </div>

                <div class="result-location">

                    ${escapeHtml(
                        result.district ||
                        "Unknown District"
                    )}

                </div>

            </div>

            <div class="result-probability-block">

                <div
                    class="
                        result-probability
                        ${tierClass}
                    "
                >

                    ${escapeHtml(
                        probabilityText
                    )}

                </div>

                <div
                    class="
                        tier-badge
                        tier-${tierClass}
                    "
                >

                    ${tierEmoji(
                        tier
                    )}

                    ${escapeHtml(
                        tier
                    )}

                </div>

            </div>

        </div>

        <div class="result-stats">

            <div class="result-stat">

                <span class="result-stat-label">
                    Historical Fit
                </span>

                <span class="result-stat-value">

                    ${escapeHtml(
                        String(
                            historicalFit
                        )
                    )}%

                </span>

            </div>

            <div class="result-stat">

                <span class="result-stat-label">
                    Latest Cutoff
                </span>

                <span class="result-stat-value">

                    ${escapeHtml(
                        String(
                            latestCutoff
                        )
                    )}

                </span>

            </div>

            <div class="result-stat">

                <span class="result-stat-label">
                    Latest Closing Rank
                </span>

                <span class="result-stat-value">

                    ${escapeHtml(
                        String(
                            latestRank
                        )
                    )}

                </span>

            </div>

            <div class="result-stat">

                <span class="result-stat-label">
                    Historical Years
                </span>

                <span class="result-stat-value">

                    ${escapeHtml(
                        String(
                            years
                        )
                    )}

                </span>

            </div>

            <div class="result-stat">

                <span class="result-stat-label">
                    5-Year Change
                </span>

                <span class="result-stat-value">

                    ${escapeHtml(
                        String(
                            changeText
                        )
                    )}

                </span>

            </div>

        </div>

        <details class="result-reasoning">

            <summary>
                Why this estimate?
            </summary>

            <div class="result-reasoning-text">

                ${escapeHtml(
                    reasoning
                )}

            </div>

        </details>

        <div class="result-actions">

            <button
                class="add-choice-btn"
                type="button"
            >
                Add to Choice Optimizer
            </button>

        </div>

    `;

    const addButton =
        card.querySelector(
            ".add-choice-btn"
        );

    const alreadyAdded =
        choices.some(
            choice =>

                String(
                    choice.college_code
                ) ===
                    String(
                        result.college_code
                    ) &&

                String(
                    choice.branch_code
                ) ===
                    String(
                        result.branch_code
                    )
        );

    if (
        alreadyAdded
    ) {

        addButton.textContent =
            "Already Added";

        addButton.disabled =
            true;

    }

    addButton.addEventListener(
        "click",
        () => {

            const added =
                addChoice(
                    result
                );

            addButton.textContent =
                added
                    ? "Added to Choices"
                    : "Already Added";

            addButton.disabled =
                true;

        }
    );

    return card;

}

function tierEmoji(
    tier
) {

    if (
        tier ===
        "Safe"
    ) {

        return "🛡";

    }

    if (
        tier ===
        "Reach"
    ) {

        return "🔥";

    }

    return "🎯";

}

/* =========================================================
   RAG
========================================================= */

async function loadRagExplanation(
    mode,
    input
) {

    ragSection.classList.remove(
        "hidden"
    );

    ragLoading.classList.remove(
        "hidden"
    );

    ragContent.innerHTML =
        "";

    hideRagError();

    const endpoint =
        mode ===
        "cutoff"
            ? "/api/rag-explanation"
            : "/api/rank-rag-explanation";

    const params =
        new URLSearchParams();

    if (
        mode ===
        "cutoff"
    ) {

        params.set(
            "cutoff_mark",
            input.cutoffMark
        );

    } else {

        params.set(
            "state_rank",
            input.stateRank
        );

    }

    params.set(
        "community",
        input.community
    );

    if (
        input.districts.length ===
        1
    ) {

        params.set(
            "district",
            input.districts[0]
        );

    }

    if (
        input.branches.length ===
        1
    ) {

        params.set(
            "branch_code",
            input.branches[0]
        );

    }

    if (
        input.collegeCode
    ) {

        params.set(
            "college_code",
            input.collegeCode
        );

    }

    try {

        const response =
            await fetch(
                `${endpoint}?${params.toString()}`
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            throw new Error(
                data.message ||
                "RAG explanation failed."
            );

        }

        ragModelBadge.textContent =
            data.generation_model ||
            "Gemini";

        renderRag(
            data.explanation ||
            "No explanation was returned."
        );

        if (
            input.districts.length >
                1 ||
            input.branches.length >
                1
        ) {

            ragSubtitle.textContent =
                "Gemini explanation based on the selected filters and available historical evidence.";

        } else {

            ragSubtitle.textContent =
                "Gemini explanation grounded in historical TNEA evidence.";

        }

    } catch (
        error
    ) {

        showRagError(
            "AI historical analysis could not be generated right now. " +
            error.message
        );

    } finally {

        ragLoading.classList.add(
            "hidden"
        );

    }

}

function renderRag(
    text
) {

    const sections = {

        Summary:
            [],

        "Historical Evidence":
            [],

        "How to Interpret":
            [],

        Limitations:
            []

    };

    let currentSection =
        "Summary";

    String(
        text
    )
        .split(
            "\n"
        )
        .forEach(
            line => {

                const cleaned =
                    line
                        .replace(
                            /\*\*/g,
                            ""
                        )
                        .trim();

                if (
                    !cleaned
                ) {

                    return;

                }

                const heading =
                    cleaned.replace(
                        /:$/,
                        ""
                    );

                if (
                    Object.prototype.hasOwnProperty.call(
                        sections,
                        heading
                    )
                ) {

                    currentSection =
                        heading;

                    return;

                }

                sections[
                    currentSection
                ].push(
                    cleaned
                );

            }
        );

    ragContent.innerHTML =
        "";

    Object.entries(
        sections
    ).forEach(
        (
            [
                heading,
                paragraphs
            ]
        ) => {

            if (
                paragraphs.length ===
                0
            ) {

                return;

            }

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "rag-card";

            const title =
                document.createElement(
                    "h3"
                );

            title.textContent =
                heading;

            card.appendChild(
                title
            );

            paragraphs.forEach(
                paragraph => {

                    const p =
                        document.createElement(
                            "p"
                        );

                    p.textContent =
                        paragraph;

                    card.appendChild(
                        p
                    );

                }
            );

            ragContent.appendChild(
                card
            );

        }
    );

    if (
        ragContent.children.length ===
        0
    ) {

        const card =
            document.createElement(
                "div"
            );

        card.className =
            "rag-card";

        const p =
            document.createElement(
                "p"
            );

        p.textContent =
            String(
                text
            );

        card.appendChild(
            p
        );

        ragContent.appendChild(
            card
        );

    }

}

/* =========================================================
   CHOICE OPTIMIZER
========================================================= */

/*
   TWO SECTIONS:

   1. AI SUGGESTED CHOICE LIST
      Automatically generated from the latest prediction
      probabilities and historical signals.

      Student can:
      - Move up
      - Move down
      - Drag
      - Remove
      - Add individual choices to My Choice List
      - Use the complete list

   2. MY CHOICE LIST
      Completely controlled by the student.

      The system NEVER automatically reorders this list.
*/

function createOptimizerControls() {

    if (
        !optimizerTab
    ) {

        return;

    }

    const panel =
        optimizerTab.querySelector(
            ".page-panel"
        );

    if (
        !panel
    ) {

        return;

    }

    if (
        byId(
            "optimizerControls"
        )
    ) {

        return;

    }

    const header =
        panel.querySelector(
            ".section-header"
        );

    if (
        header
    ) {

        const heading =
            header.querySelector(
                "h2"
            );

        const description =
            header.querySelector(
                "p"
            );

        if (
            heading
        ) {

            heading.textContent =
                "Build Your Choice List";

        }

        if (
            description
        ) {

            description.textContent =
                "Start with an AI-suggested list or build your own. You control the final preference order.";

        }

    }

    const controls =
        document.createElement(
            "div"
        );

    controls.id =
        "optimizerControls";

    controls.innerHTML = `

        <section
            style="
                margin-top:18px;
                padding:18px;
                border:1px solid rgba(99,102,241,0.20);
                border-radius:16px;
                background:linear-gradient(
                    135deg,
                    rgba(99,102,241,0.09),
                    rgba(6,182,212,0.04)
                );
            "
        >

            <div
                style="
                    display:flex;
                    justify-content:space-between;
                    align-items:flex-start;
                    gap:16px;
                    flex-wrap:wrap;
                "
            >

                <div>

                    <div
                        style="
                            color:#818cf8;
                            font-size:0.68rem;
                            font-weight:900;
                            letter-spacing:0.08em;
                        "
                    >
                        AI ASSISTED
                    </div>

                    <div
                        style="
                            color:#f8fafc;
                            font-size:1rem;
                            font-weight:900;
                            margin-top:3px;
                        "
                    >
                        AI Suggested Choice List
                    </div>

                    <div
                        style="
                            color:#94a3b8;
                            font-size:0.74rem;
                            line-height:1.5;
                            margin-top:5px;
                            max-width:780px;
                        "
                    >
                        Automatically generated from your latest prediction probabilities, historical fit and Safe / Target / Reach classification. You can edit it completely.
                    </div>

                </div>

                <div
                    style="
                        display:flex;
                        gap:8px;
                        flex-wrap:wrap;
                    "
                >

                    <button
                        id="regenerateAIButton"
                        type="button"
                        class="secondary-button"
                    >
                        Regenerate
                    </button>

                    <button
                        id="useAIListButton"
                        type="button"
                        class="primary-button"
                    >
                        Use This List
                    </button>

                </div>

            </div>

            <div
                id="aiSuggestedSummary"
                style="
                    margin-top:12px;
                    color:#cbd5e1;
                    font-size:0.73rem;
                    line-height:1.5;
                "
            ></div>

            <div
                id="aiSuggestedList"
                style="
                    display:flex;
                    flex-direction:column;
                    gap:9px;
                    margin-top:12px;
                "
            ></div>

            <div
                id="aiSuggestedEmpty"
                style="
                    display:none;
                    padding:18px;
                    margin-top:12px;
                    border-radius:12px;
                    border:1px dashed rgba(148,163,184,0.18);
                    color:#64748b;
                    font-size:0.75rem;
                    line-height:1.5;
                "
            >
                Run a prediction first to generate the AI-suggested list.
            </div>

        </section>

        <section
            style="
                margin-top:18px;
                margin-bottom:10px;
            "
        >

            <div
                style="
                    color:#818cf8;
                    font-size:0.68rem;
                    font-weight:900;
                    letter-spacing:0.08em;
                "
            >
                YOUR PREFERENCES
            </div>

            <div
                style="
                    color:#f8fafc;
                    font-size:1rem;
                    font-weight:900;
                    margin-top:3px;
                "
            >
                My Choice List
            </div>

            <div
                style="
                    color:#94a3b8;
                    font-size:0.74rem;
                    line-height:1.5;
                    margin-top:5px;
                "
            >
                Your final choice order. The application never automatically reorders this list.
            </div>

            <div
                id="optimizerListSummary"
                style="
                    margin-top:10px;
                "
            ></div>

        </section>

        <div
            style="
                margin-top:10px;
                padding:10px 12px;
                border-radius:10px;
                background:rgba(148,163,184,0.035);
                border:1px solid rgba(148,163,184,0.08);
                color:#64748b;
                font-size:0.7rem;
                line-height:1.5;
            "
        >
            Drag choices to reorder them or use ↑ / ↓. Probability and tier are supporting information only.
        </div>

    `;

    const empty =
        byId(
            "emptyChoices"
        );

    if (
        empty
    ) {

        panel.insertBefore(
            controls,
            empty
        );

    } else {

        panel.appendChild(
            controls
        );

    }

    byId(
        "regenerateAIButton"
    )?.addEventListener(
        "click",
        () => {

            generateAISuggestedList();

        }
    );

    byId(
        "useAIListButton"
    )?.addEventListener(
        "click",
        () => {

            useAISuggestedList();

        }
    );

    renderAISuggestedList();

}

/* =========================================================
   AI SUGGESTED LIST GENERATION
========================================================= */

function generateAISuggestedList() {

    if (
        !Array.isArray(
            latestResults
        ) ||
        latestResults.length ===
        0
    ) {

        aiSuggestedChoices =
            [];

        renderAISuggestedList();

        return;

    }

    const validResults =
        latestResults
            .map(
                normalizeChoice
            )
            .filter(
                result =>
                    Number.isFinite(
                        Number(
                            result.estimated_probability
                        )
                    )
            );

    if (
        validResults.length ===
        0
    ) {

        aiSuggestedChoices =
            [];

        renderAISuggestedList();

        return;

    }

    const sorted =
        [
            ...validResults
        ].sort(
            compareProbabilityDescending
        );

    const safe =
        sorted.filter(
            item =>
                normalizeTier(
                    item.tier
                ) ===
                "Safe"
        );

    const target =
        sorted.filter(
            item =>
                normalizeTier(
                    item.tier
                ) ===
                "Target"
        );

    const reach =
        sorted.filter(
            item =>
                normalizeTier(
                    item.tier
                ) ===
                "Reach"
        );

    const selected =
        [];

    const selectedKeys =
        new Set();

    function addCandidate(
        candidate
    ) {

        if (
            !candidate ||
            selected.length >=
            12
        ) {

            return;

        }

        const key =
            choiceKey(
                candidate
            );

        if (
            selectedKeys.has(
                key
            )
        ) {

            return;

        }

        selected.push(
            candidate
        );

        selectedKeys.add(
            key
        );

    }

    /*
       First include up to four choices
       from each available tier.
    */

    safe
        .slice(
            0,
            4
        )
        .forEach(
            addCandidate
        );

    target
        .slice(
            0,
            4
        )
        .forEach(
            addCandidate
        );

    reach
        .slice(
            0,
            4
        )
        .forEach(
            addCandidate
        );

    /*
       Fill any remaining slots using
       highest probability options.
    */

    sorted.forEach(
        candidate => {

            if (
                selected.length >=
                12
            ) {

                return;

            }

            addCandidate(
                candidate
            );

        }
    );

    /*
       Initial AI order is probability based.
       The student can freely change this afterwards.
    */

    selected.sort(
        compareProbabilityDescending
    );

    aiSuggestedChoices =
        selected;

    renderAISuggestedList();

}

/* =========================================================
   AI LIST RENDER
========================================================= */

function renderAISuggestedList() {

    const container =
        byId(
            "aiSuggestedList"
        );

    const summary =
        byId(
            "aiSuggestedSummary"
        );

    const empty =
        byId(
            "aiSuggestedEmpty"
        );

    if (
        !container ||
        !summary ||
        !empty
    ) {

        return;

    }

    container.innerHTML =
        "";

    if (
        aiSuggestedChoices.length ===
        0
    ) {

        summary.textContent =
            "No AI suggestion is available yet.";

        empty.style.display =
            "block";

        return;

    }

    empty.style.display =
        "none";

    const counts =
        calculateTierCountsForList(
            aiSuggestedChoices
        );

    summary.textContent =
        `Generated ${
            aiSuggestedChoices.length
        } starting choices · ${
            counts.Safe
        } Safe · ${
            counts.Target
        } Target · ${
            counts.Reach
        } Reach`;

    aiSuggestedChoices.forEach(
        (
            choice,
            index
        ) => {

            container.appendChild(
                createAISuggestedCard(
                    choice,
                    index
                )
            );

        }
    );

}

/* =========================================================
   AI CARD
========================================================= */

function createAISuggestedCard(
    choice,
    index
) {

    const card =
        document.createElement(
            "div"
        );

    card.draggable =
        true;

    card.style.cssText = `
        display:grid;
        grid-template-columns:42px minmax(0,1fr) auto;
        gap:12px;
        align-items:center;
        padding:12px;
        border-radius:13px;
        border:1px solid rgba(148,163,184,0.12);
        background:rgba(18,26,43,0.66);
    `;

    const tier =
        normalizeTier(
            choice.tier
        ) ||
        "Target";

    const probability =
        formatProbability(
            choice.estimated_probability
        );

    const fit =
        choice.historical_fit_score ??
        "—";

    const tierColor =
        getTierColor(
            tier
        );

    card.innerHTML = `

        <div
            style="
                width:36px;
                height:36px;
                border-radius:10px;
                display:flex;
                align-items:center;
                justify-content:center;
                background:rgba(99,102,241,0.12);
                border:1px solid rgba(99,102,241,0.22);
                color:#c7d2fe;
                font-family:var(--font-mono, monospace);
                font-weight:900;
                font-size:0.76rem;
                cursor:grab;
            "
            title="Drag to reorder"
        >

            ☰

            <span
                style="
                    margin-left:4px;
                "
            >
                ${index + 1}
            </span>

        </div>

        <div>

            <div
                style="
                    color:#f8fafc;
                    font-size:0.84rem;
                    font-weight:900;
                    line-height:1.35;
                "
            >

                ${escapeHtml(
                    choice.college_name ||
                    "Unknown College"
                )}

            </div>

            <div
                style="
                    color:#a5b4fc;
                    font-size:0.76rem;
                    font-weight:700;
                    margin-top:3px;
                "
            >

                ${escapeHtml(
                    choice.branch_name ||
                    choice.branch_code ||
                    "Unknown Branch"
                )}

            </div>

            <div
                style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:6px;
                    margin-top:7px;
                "
            >

                <span
                    style="
                        font-size:0.66rem;
                        padding:3px 7px;
                        border-radius:999px;
                        border:1px solid ${tierColor.border};
                        background:${tierColor.background};
                        color:${tierColor.text};
                        font-weight:900;
                    "
                >

                    ${tierEmoji(
                        tier
                    )}

                    ${escapeHtml(
                        tier
                    )}

                </span>

                <span
                    style="
                        font-size:0.66rem;
                        padding:3px 7px;
                        border-radius:999px;
                        border:1px solid rgba(148,163,184,0.14);
                        background:rgba(148,163,184,0.04);
                        color:#cbd5e1;
                        font-weight:800;
                    "
                >

                    Chance:
                    ${escapeHtml(
                        probability
                    )}

                </span>

                <span
                    style="
                        font-size:0.66rem;
                        padding:3px 7px;
                        border-radius:999px;
                        border:1px solid rgba(148,163,184,0.14);
                        background:rgba(148,163,184,0.04);
                        color:#94a3b8;
                        font-weight:800;
                    "
                >

                    Fit:
                    ${escapeHtml(
                        String(
                            fit
                        )
                    )}%

                </span>

                <span
                    style="
                        font-size:0.66rem;
                        padding:3px 7px;
                        border-radius:999px;
                        border:1px solid rgba(148,163,184,0.14);
                        background:rgba(148,163,184,0.04);
                        color:#94a3b8;
                        font-weight:800;
                    "
                >

                    ${escapeHtml(
                        choice.district ||
                        "Unknown District"
                    )}

                </span>

            </div>

        </div>

        <div
            style="
                display:flex;
                flex-wrap:wrap;
                justify-content:flex-end;
                gap:5px;
            "
        >

            <button
                class="ai-move-up"
                type="button"
                ${
                    index ===
                    0
                        ? "disabled"
                        : ""
                }
            >
                ↑
            </button>

            <button
                class="ai-move-down"
                type="button"
                ${
                    index ===
                    aiSuggestedChoices.length - 1
                        ? "disabled"
                        : ""
                }
            >
                ↓
            </button>

            <button
                class="ai-add-my-list"
                type="button"
            >
                Add
            </button>

            <button
                class="ai-remove"
                type="button"
            >
                Remove
            </button>

        </div>

    `;

    const buttons =
        [
            card.querySelector(
                ".ai-move-up"
            ),

            card.querySelector(
                ".ai-move-down"
            ),

            card.querySelector(
                ".ai-add-my-list"
            ),

            card.querySelector(
                ".ai-remove"
            )
        ];

    buttons.forEach(
        button => {

            if (
                !button
            ) {

                return;

            }

            button.style.cssText = `
                min-height:31px;
                padding:0 8px;
                border-radius:8px;
                border:1px solid rgba(148,163,184,0.14);
                background:rgba(15,23,42,0.68);
                color:#cbd5e1;
                cursor:pointer;
                font-size:0.68rem;
                font-weight:900;
            `;

        }
    );

    card.querySelector(
        ".ai-move-up"
    )?.addEventListener(
        "click",
        () => {

            moveAISuggestedChoice(
                index,
                -1
            );

        }
    );

    card.querySelector(
        ".ai-move-down"
    )?.addEventListener(
        "click",
        () => {

            moveAISuggestedChoice(
                index,
                1
            );

        }
    );

    card.querySelector(
        ".ai-add-my-list"
    )?.addEventListener(
        "click",
        event => {

            const button =
                event.currentTarget;

            const added =
                addChoice(
                    choice
                );

            button.textContent =
                added
                    ? "Added"
                    : "Already Added";

            button.disabled =
                true;

        }
    );

    card.querySelector(
        ".ai-remove"
    )?.addEventListener(
        "click",
        () => {

            removeAISuggestedChoice(
                index
            );

        }
    );

    card.addEventListener(
        "dragstart",
        event => {

            draggedAIChoiceIndex =
                index;

            card.style.opacity =
                "0.45";

            event.dataTransfer.effectAllowed =
                "move";

            event.dataTransfer.setData(
                "text/plain",
                String(
                    index
                )
            );

        }
    );

    card.addEventListener(
        "dragend",
        () => {

            draggedAIChoiceIndex =
                null;

            card.style.opacity =
                "1";

        }
    );

    card.addEventListener(
        "dragover",
        event => {

            event.preventDefault();

            event.dataTransfer.dropEffect =
                "move";

        }
    );

    card.addEventListener(
        "drop",
        event => {

            event.preventDefault();

            let sourceIndex =
                draggedAIChoiceIndex;

            if (
                sourceIndex ===
                null
            ) {

                sourceIndex =
                    Number(
                        event.dataTransfer.getData(
                            "text/plain"
                        )
                    );

            }

            if (
                !Number.isInteger(
                    sourceIndex
                ) ||
                sourceIndex < 0 ||
                sourceIndex >=
                    aiSuggestedChoices.length
            ) {

                return;

            }

            if (
                sourceIndex ===
                index
            ) {

                return;

            }

            const moved =
                aiSuggestedChoices.splice(
                    sourceIndex,
                    1
                )[0];

            aiSuggestedChoices.splice(
                index,
                0,
                moved
            );

            draggedAIChoiceIndex =
                null;

            renderAISuggestedList();

        }
    );

    return card;

}

/* =========================================================
   MOVE AI CHOICE
========================================================= */

function moveAISuggestedChoice(
    index,
    direction
) {

    const newIndex =
        index +
        direction;

    if (
        newIndex < 0 ||
        newIndex >=
            aiSuggestedChoices.length
    ) {

        return;

    }

    const temp =
        aiSuggestedChoices[
            index
        ];

    aiSuggestedChoices[
        index
    ] =
        aiSuggestedChoices[
            newIndex
        ];

    aiSuggestedChoices[
        newIndex
    ] =
        temp;

    renderAISuggestedList();

}

/* =========================================================
   REMOVE AI CHOICE
========================================================= */

function removeAISuggestedChoice(
    index
) {

    if (
        index < 0 ||
        index >=
            aiSuggestedChoices.length
    ) {

        return;

    }

    aiSuggestedChoices.splice(
        index,
        1
    );

    renderAISuggestedList();

}

/* =========================================================
   USE AI LIST
========================================================= */

function useAISuggestedList() {

    if (
        aiSuggestedChoices.length ===
        0
    ) {

        alert(
            "Run a prediction first to generate the AI-suggested choice list."
        );

        return;

    }

    /*
       Copy the CURRENT edited AI list into My Choice List.

       This preserves the exact order that the student
       created inside the AI section.
    */

    choices =
        aiSuggestedChoices.map(
            normalizeChoice
        );

    saveChoices();

    renderChoices();

    alert(
        "The AI-suggested list has been copied to My Choice List in the same order. You can now edit it freely."
    );

}

/* =========================================================
   ADD TO MY LIST
========================================================= */

function addChoice(
    choice
) {

    const normalized =
        normalizeChoice(
            choice
        );

    const alreadyExists =
        choices.some(
            item =>

                String(
                    item.college_code
                ) ===
                    String(
                        normalized.college_code
                    ) &&

                String(
                    item.branch_code
                ) ===
                    String(
                        normalized.branch_code
                    )
        );

    if (
        alreadyExists
    ) {

        return false;

    }

    choices.push(
        normalized
    );

    saveChoices();

    renderChoices();

    return true;

}

/* =========================================================
   NORMALIZE CHOICE
========================================================= */

function normalizeChoice(
    choice
) {

    return {

        college_code:
            choice.college_code ??
            "",

        college_name:
            choice.college_name ??
            "",

        branch_code:
            choice.branch_code ??
            "",

        branch_name:
            choice.branch_name ??
            "",

        district:
            choice.district ??
            "",

        latest_cutoff:
            choice.latest_cutoff ??
            null,

        latest_closing_rank:
            choice.latest_closing_rank ??
            null,

        historical_fit_score:
            choice.historical_fit_score ??
            null,

        estimated_probability:
            choice.estimated_probability ??
            null,

        tier:
            normalizeTier(
                choice.tier
            ),

        probability_reasoning:
            choice.probability_reasoning ??
            ""

    };

}

/* =========================================================
   REMOVE MY CHOICE
========================================================= */

function removeChoice(
    index
) {

    if (
        index < 0 ||
        index >=
            choices.length
    ) {

        return;

    }

    choices.splice(
        index,
        1
    );

    saveChoices();

    renderChoices();

}

/* =========================================================
   MOVE MY CHOICE UP
========================================================= */

function moveChoiceUp(
    index
) {

    if (
        index <=
        0
    ) {

        return;

    }

    const previous =
        choices[
            index - 1
        ];

    choices[
        index - 1
    ] =
        choices[
            index
        ];

    choices[
        index
    ] =
        previous;

    saveChoices();

    renderChoices();

}

/* =========================================================
   MOVE MY CHOICE DOWN
========================================================= */

function moveChoiceDown(
    index
) {

    if (
        index < 0 ||
        index >=
            choices.length - 1
    ) {

        return;

    }

    const next =
        choices[
            index + 1
        ];

    choices[
        index + 1
    ] =
        choices[
            index
        ];

    choices[
        index
    ] =
        next;

    saveChoices();

    renderChoices();

}

/* =========================================================
   MY CHOICE DRAG START
========================================================= */

function handleChoiceDragStart(
    event,
    index
) {

    draggedChoiceIndex =
        index;

    event.dataTransfer.effectAllowed =
        "move";

    event.dataTransfer.setData(
        "text/plain",
        String(
            index
        )
    );

    event.currentTarget.style.opacity =
        "0.45";

}

/* =========================================================
   MY CHOICE DRAG END
========================================================= */

function handleChoiceDragEnd(
    event
) {

    event.currentTarget.style.opacity =
        "1";

    draggedChoiceIndex =
        null;

}

/* =========================================================
   MY CHOICE DRAG OVER
========================================================= */

function handleChoiceDragOver(
    event
) {

    event.preventDefault();

    event.dataTransfer.dropEffect =
        "move";

}

/* =========================================================
   MY CHOICE DROP
========================================================= */

function handleChoiceDrop(
    event,
    targetIndex
) {

    event.preventDefault();

    let sourceIndex =
        draggedChoiceIndex;

    if (
        sourceIndex ===
        null
    ) {

        sourceIndex =
            Number(
                event.dataTransfer.getData(
                    "text/plain"
                )
            );

    }

    if (
        !Number.isInteger(
            sourceIndex
        ) ||
        sourceIndex < 0 ||
        sourceIndex >=
            choices.length
    ) {

        draggedChoiceIndex =
            null;

        return;

    }

    if (
        sourceIndex ===
        targetIndex
    ) {

        draggedChoiceIndex =
            null;

        return;

    }

    const moved =
        choices.splice(
            sourceIndex,
            1
        )[0];

    choices.splice(
        targetIndex,
        0,
        moved
    );

    draggedChoiceIndex =
        null;

    saveChoices();

    renderChoices();

}

/* =========================================================
   RENDER MY CHOICE LIST
========================================================= */

function renderChoices() {

    if (
        !choicesContainer ||
        !emptyChoices
    ) {

        return;

    }

    if (
        choices.length ===
        0
    ) {

        emptyChoices.classList.remove(
            "hidden"
        );

        choicesContainer.classList.add(
            "hidden"
        );

        updateOptimizerListSummary();

        return;

    }

    emptyChoices.classList.add(
        "hidden"
    );

    choicesContainer.classList.remove(
        "hidden"
    );

    choicesContainer.innerHTML =
        "";

    choices.forEach(
        (
            choice,
            index
        ) => {

            const card =
                document.createElement(
                    "div"
                );

            card.className =
                "choice-card";

            card.draggable =
                true;

            const probability =
                formatProbability(
                    choice.estimated_probability
                );

            const tier =
                normalizeTier(
                    choice.tier
                );

            const tierLabel =
                tier ||
                "—";

            const tierColor =
                getTierColor(
                    tier
                );

            card.innerHTML = `

                <div
                    class="choice-number"
                    style="
                        cursor:grab;
                    "
                    title="Drag to reorder"
                >

                    ☰

                    <span
                        style="
                            margin-left:5px;
                        "
                    >
                        ${index + 1}
                    </span>

                </div>

                <div>

                    <div class="choice-college">

                        ${escapeHtml(
                            choice.college_name
                        )}

                    </div>

                    <div class="choice-branch">

                        ${escapeHtml(
                            choice.branch_name ||
                            choice.branch_code
                        )}

                    </div>

                    <div class="choice-meta">

                        ${escapeHtml(
                            choice.district ||
                            "Unknown District"
                        )}

                        · Code:

                        ${escapeHtml(
                            String(
                                choice.college_code
                            )
                        )}

                    </div>

                    <div
                        style="
                            display:flex;
                            gap:8px;
                            flex-wrap:wrap;
                            margin-top:7px;
                        "
                    >

                        <span
                            style="
                                font-size:0.67rem;
                                padding:4px 8px;
                                border-radius:999px;
                                border:1px solid ${tierColor.border};
                                background:${tierColor.background};
                                color:${tierColor.text};
                                font-weight:900;
                            "
                        >

                            ${tierEmoji(
                                tier
                            )}

                            ${escapeHtml(
                                tierLabel
                            )}

                        </span>

                        <span
                            style="
                                font-size:0.67rem;
                                padding:4px 8px;
                                border-radius:999px;
                                border:1px solid rgba(148,163,184,0.16);
                                background:rgba(148,163,184,0.05);
                                color:#cbd5e1;
                                font-weight:800;
                            "
                        >

                            Chance:
                            ${escapeHtml(
                                probability
                            )}

                        </span>

                    </div>

                </div>

                <div class="choice-stats">

                    <div>

                        Cutoff:
                        ${escapeHtml(
                            String(
                                choice.latest_cutoff ??
                                "—"
                            )
                        )}

                    </div>

                    <div>

                        Rank:
                        ${escapeHtml(
                            String(
                                choice.latest_closing_rank ??
                                "—"
                            )
                        )}

                    </div>

                </div>

                <div
                    style="
                        display:flex;
                        gap:6px;
                        align-items:center;
                        flex-wrap:wrap;
                    "
                >

                    <button
                        class="optimizer-move-up"
                        type="button"
                        title="Move up"
                        ${
                            index ===
                            0
                                ? "disabled"
                                : ""
                        }
                    >
                        ↑
                    </button>

                    <button
                        class="optimizer-move-down"
                        type="button"
                        title="Move down"
                        ${
                            index ===
                            choices.length - 1
                                ? "disabled"
                                : ""
                        }
                    >
                        ↓
                    </button>

                    <button
                        class="remove-choice-btn"
                        type="button"
                    >
                        Remove
                    </button>

                </div>

            `;

            card.addEventListener(
                "dragstart",
                event => {

                    handleChoiceDragStart(
                        event,
                        index
                    );

                }
            );

            card.addEventListener(
                "dragend",
                handleChoiceDragEnd
            );

            card.addEventListener(
                "dragover",
                handleChoiceDragOver
            );

            card.addEventListener(
                "drop",
                event => {

                    handleChoiceDrop(
                        event,
                        index
                    );

                }
            );

            card
                .querySelector(
                    ".optimizer-move-up"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        moveChoiceUp(
                            index
                        );

                    }
                );

            card
                .querySelector(
                    ".optimizer-move-down"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        moveChoiceDown(
                            index
                        );

                    }
                );

            card
                .querySelector(
                    ".remove-choice-btn"
                )
                ?.addEventListener(
                    "click",
                    () => {

                        removeChoice(
                            index
                        );

                    }
                );

            choicesContainer.appendChild(
                card
            );

        }
    );

    updateOptimizerListSummary();

}

/* =========================================================
   MY LIST SUMMARY
========================================================= */

function updateOptimizerListSummary() {

    const summary =
        byId(
            "optimizerListSummary"
        );

    if (
        !summary
    ) {

        return;

    }

    const counts =
        calculateTierCountsForList(
            choices
        );

    if (
        choices.length ===
        0
    ) {

        summary.innerHTML = `
            <div
                style="
                    color:#64748b;
                    font-size:0.72rem;
                "
            >
                No choices added yet.
            </div>
        `;

        return;

    }

    summary.innerHTML = `

        <div
            style="
                display:flex;
                gap:8px;
                flex-wrap:wrap;
            "
        >

            <span class="
                distribution-pill
                distribution-safe
            ">
                🛡 Safe:
                ${counts.Safe}
            </span>

            <span class="
                distribution-pill
                distribution-target
            ">
                🎯 Target:
                ${counts.Target}
            </span>

            <span class="
                distribution-pill
                distribution-reach
            ">
                🔥 Reach:
                ${counts.Reach}
            </span>

            <span
                class="distribution-pill"
                style="
                    background:rgba(148,163,184,0.06);
                    color:#94a3b8;
                    border:1px solid rgba(148,163,184,0.15);
                "
            >
                Total:
                ${choices.length}
            </span>

        </div>

    `;

}

/* =========================================================
   TIER COUNTS
========================================================= */

function calculateTierCountsForList(
    list
) {

    const counts = {

        Safe:
            0,

        Target:
            0,

        Reach:
            0

    };

    list.forEach(
        choice => {

            const tier =
                normalizeTier(
                    choice.tier
                );

            if (
                tier &&
                counts[
                    tier
                ] !==
                undefined
            ) {

                counts[
                    tier
                ] +=
                    1;

            }

        }
    );

    return counts;

}

/* =========================================================
   STORAGE
========================================================= */

function saveChoices() {

    localStorage.setItem(
        "collegeconnect_choices",
        JSON.stringify(
            choices
        )
    );

}

function loadSavedChoices() {

    try {

        const saved =
            localStorage.getItem(
                "collegeconnect_choices"
            );

        if (
            !saved
        ) {

            return [];

        }

        const parsed =
            JSON.parse(
                saved
            );

        if (
            !Array.isArray(
                parsed
            )
        ) {

            return [];

        }

        return parsed.map(
            normalizeChoice
        );

    } catch {

        return [];

    }

}

/* =========================================================
   CLEAR MY CHOICE LIST
========================================================= */

clearChoicesButton?.addEventListener(
    "click",
    () => {

        if (
            choices.length ===
            0
        ) {

            return;

        }

        const confirmed =
            window.confirm(
                "Clear your entire My Choice List?"
            );

        if (
            !confirmed
        ) {

            return;

        }

        choices =
            [];

        saveChoices();

        renderChoices();

    }
);

/* =========================================================
   EXPORT CSV
========================================================= */

exportButton?.addEventListener(
    "click",
    () => {

        if (
            choices.length ===
            0
        ) {

            alert(
                "There are no choices to export."
            );

            return;

        }

        const headers = [

            "Preference",

            "College Code",

            "College",

            "Branch Code",

            "Branch",

            "District",

            "Latest Cutoff",

            "Latest Closing Rank",

            "Historical Fit Score",

            "Estimated Probability",

            "Tier",

            "Probability Reasoning"

        ];

        const rows =
            choices.map(
                (
                    choice,
                    index
                ) => [

                    index + 1,

                    choice.college_code,

                    choice.college_name,

                    choice.branch_code,

                    choice.branch_name,

                    choice.district,

                    choice.latest_cutoff,

                    choice.latest_closing_rank,

                    choice.historical_fit_score,

                    choice.estimated_probability,

                    choice.tier,

                    choice.probability_reasoning

                ]
            );

        const csv =
            [
                headers,
                ...rows
            ]
                .map(
                    row =>
                        row
                            .map(
                                csvEscape
                            )
                            .join(
                                ","
                            )
                )
                .join(
                    "\n"
                );

        const blob =
            new Blob(
                [
                    csv
                ],
                {
                    type:
                        "text/csv;charset=utf-8;"
                }
            );

        const url =
            URL.createObjectURL(
                blob
            );

        const link =
            document.createElement(
                "a"
            );

        link.href =
            url;

        link.download =
            "collegeconnect_choice_list.csv";

        document.body.appendChild(
            link
        );

        link.click();

        link.remove();

        URL.revokeObjectURL(
            url
        );

    }
);

function csvEscape(
    value
) {

    const text =
        value === null ||
        value === undefined
            ? ""
            : String(
                value
            );

    if (
        text.includes(
            ","
        ) ||
        text.includes(
            '"'
        ) ||
        text.includes(
            "\n"
        )
    ) {

        return (
            '"' +
            text.replaceAll(
                '"',
                '""'
            ) +
            '"'
        );

    }

    return text;

}

/* =========================================================
   MATRIX
========================================================= */

async function loadMatrixDistricts() {

    try {

        const response =
            await fetch(
                "/api/districts"
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            return;

        }

        matrixDistrict.innerHTML = `
            <option value="">
                All districts
            </option>
        `;

        data.districts.forEach(
            district => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    district;

                option.textContent =
                    district;

                matrixDistrict.appendChild(
                    option
                );

            }
        );

    } catch {

        // Ignore initial matrix errors.

    }

}

async function loadMatrixBranches() {

    try {

        const params =
            new URLSearchParams();

        if (
            matrixDistrict.value
        ) {

            params.set(
                "district",
                matrixDistrict.value
            );

        }

        const query =
            params.toString();

        const url =
            query
                ? `/api/branches?${query}`
                : "/api/branches";

        const response =
            await fetch(
                url
            );

        const data =
            await response.json();

        if (
            !response.ok ||
            data.status !== "ok"
        ) {

            return;

        }

        matrixBranch.innerHTML = `
            <option value="">
                All branches
            </option>
        `;

        data.branches.forEach(
            branch => {

                const option =
                    document.createElement(
                        "option"
                    );

                option.value =
                    branch.branch_code;

                option.textContent =
                    `${branch.branch_code} - ${branch.branch_name}`;

                matrixBranch.appendChild(
                    option
                );

            }
        );

    } catch {

        // Ignore initial matrix errors.

    }

}

matrixDistrict?.addEventListener(
    "change",
    async () => {

        await loadMatrixBranches();

    }
);

loadMatrixButton?.addEventListener(
    "click",
    async () => {

        hideMatrixError();

        if (
            !matrixCommunity.value
        ) {

            showMatrixError(
                "Please select a community."
            );

            return;

        }

        setMatrixLoading(
            true
        );

        try {

            const params =
                new URLSearchParams();

            params.set(
                "community",
                matrixCommunity.value
            );

            if (
                matrixDistrict.value
            ) {

                params.set(
                    "district",
                    matrixDistrict.value
                );

            }

            if (
                matrixBranch.value
            ) {

                params.set(
                    "branch_code",
                    matrixBranch.value
                );

            }

            const response =
                await fetch(
                    `/api/rank-matrix?${params.toString()}`
                );

            const data =
                await response.json();

            if (
                !response.ok ||
                data.status !== "ok"
            ) {

                throw new Error(
                    data.message ||
                    "Failed to load rank matrix."
                );

            }

            renderMatrix(
                data
            );

        } catch (
            error
        ) {

            showMatrixError(
                error.message
            );

        } finally {

            setMatrixLoading(
                false
            );

        }

    }
);

function renderMatrix(
    data
) {

    const results =
        data.results ||
        [];

    matrixTableBody.innerHTML =
        "";

    if (
        results.length ===
        0
    ) {

        matrixTableBody.innerHTML = `
            <tr>
                <td colspan="7">
                    No historical rank records found.
                </td>
            </tr>
        `;

    } else {

        results.forEach(
            (
                result,
                index
            ) => {

                const row =
                    document.createElement(
                        "tr"
                    );

                row.innerHTML = `

                    <td>
                        ${index + 1}
                    </td>

                    <td>

                        <div class="college-name">

                            ${escapeHtml(
                                result.college_name ||
                                "—"
                            )}

                        </div>

                        <div class="code-text">

                            Code:

                            ${escapeHtml(
                                String(
                                    result.college_code ??
                                    "—"
                                )
                            )}

                        </div>

                    </td>

                    <td>

                        ${escapeHtml(
                            result.branch_name ||
                            result.branch_code ||
                            "—"
                        )}

                    </td>

                    <td>

                        ${escapeHtml(
                            result.district ||
                            "—"
                        )}

                    </td>

                    <td>

                        ${escapeHtml(
                            String(
                                result.year ??
                                "—"
                            )
                        )}

                    </td>

                    <td>

                        ${escapeHtml(
                            String(
                                result.cutoff_mark ??
                                "—"
                            )
                        )}

                    </td>

                    <td>

                        ${escapeHtml(
                            String(
                                result.closing_rank ??
                                "—"
                            )
                        )}

                    </td>

                `;

                matrixTableBody.appendChild(
                    row
                );

            }
        );

    }

    matrixSection.classList.remove(
        "hidden"
    );

}

/* =========================================================
   CLEAR PREDICTOR
========================================================= */

clearButton?.addEventListener(
    "click",
    async () => {

        cutoffInput.value =
            "";

        stateRankInput.value =
            "";

        communitySelect.value =
            "";

        selectedDistricts =
            [];

        selectedBranches =
            [];

        selectedCollege =
            null;

        districtSearch.value =
            "";

        branchSearch.value =
            "";

        collegeSearch.value =
            "";

        latestResults =
            [];

        latestPredictionData =
            null;

        aiSuggestedChoices =
            [];

        activeResultFilter =
            "ALL";

        renderDistrictPicker();

        await loadBranches();

        renderBranchPicker();

        await loadColleges();

        renderCollegeSuggestions();

        renderSelectedCollege();

        resultsSection.classList.add(
            "hidden"
        );

        ragSection.classList.add(
            "hidden"
        );

        hideError();

        hideRagError();

        renderAISuggestedList();

    }
);

/* =========================================================
   UI HELPERS
========================================================= */

function setLoading(
    visible
) {

    loading.classList.toggle(
        "hidden",
        !visible
    );

}

function showError(
    message
) {

    errorMessage.textContent =
        message;

    errorMessage.classList.remove(
        "hidden"
    );

}

function hideError() {

    errorMessage.textContent =
        "";

    errorMessage.classList.add(
        "hidden"
    );

}

function showRagError(
    message
) {

    ragError.textContent =
        message;

    ragError.classList.remove(
        "hidden"
    );

}

function hideRagError() {

    ragError.textContent =
        "";

    ragError.classList.add(
        "hidden"
    );

}

function setMatrixLoading(
    visible
) {

    matrixLoading.classList.toggle(
        "hidden",
        !visible
    );

}

function showMatrixError(
    message
) {

    matrixError.textContent =
        message;

    matrixError.classList.remove(
        "hidden"
    );

}

function hideMatrixError() {

    matrixError.textContent =
        "";

    matrixError.classList.add(
        "hidden"
    );

}

/* =========================================================
   DISPLAY HELPERS
========================================================= */

function formatProbability(
    value
) {

    if (
        value ===
            null ||
        value ===
            undefined
    ) {

        return "—";

    }

    const number =
        Number(
            value
        );

    if (
        !Number.isFinite(
            number
        )
    ) {

        return "—";

    }

    return `${number.toFixed(
        1
    )}%`;

}

function getTierColor(
    tier
) {

    if (
        tier ===
        "Safe"
    ) {

        return {

            border:
                "rgba(16,185,129,0.22)",

            background:
                "rgba(16,185,129,0.10)",

            text:
                "#10b981"

        };

    }

    if (
        tier ===
        "Reach"
    ) {

        return {

            border:
                "rgba(239,68,68,0.22)",

            background:
                "rgba(239,68,68,0.10)",

            text:
                "#ef4444"

        };

    }

    return {

        border:
            "rgba(245,158,11,0.22)",

        background:
            "rgba(245,158,11,0.10)",

        text:
            "#f59e0b"

    };

}

function compareProbabilityDescending(
    a,
    b
) {

    return (
        Number(
            b.estimated_probability
        ) -
        Number(
            a.estimated_probability
        )
    );

}

function choiceKey(
    choice
) {

    return (
        `${choice.college_code}::${choice.branch_code}`
    );

}

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}