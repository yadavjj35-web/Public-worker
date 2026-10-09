(() => {
"use strict";

const API_BASE = (
    window.API_URL ||
    "https://industrial-contractor-job-network.onrender.com/api"
).replace(/\/+$/, "");

const STATUS_ENDPOINT = `${API_BASE}/public-worker/status/`;

const statusArea = document.getElementById("statusArea");

if (!statusArea) {
    console.error("JOBNEX: statusArea not found.");
    return;
}

const state = {
    applications: [],
    activeFilter: "all",
    loading: false,
    timer: null,
    controller: null
};

const $ = id => document.getElementById(id);

const escapeHTML = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);

function getTokens() {
    let tokens = [];

    try {
        const saved = JSON.parse(
            localStorage.getItem("jobnexApplicationTokens") || "[]"
        );

        if (Array.isArray(saved)) {
            tokens = saved;
        }
    } catch {
        tokens = [];
    }

    // Support previously saved tracking tokens.
    [
        "contractorHubTrackingToken",
        "publicWorkerTrackingToken",
        "trackingToken"
    ].forEach(key => {
        const token = localStorage.getItem(key);

        if (token && !tokens.includes(token)) {
            tokens.push(token);
        }
    });

    // Include token from the application redirect URL.
    const urlToken = new URLSearchParams(
        window.location.search
    ).get("token");

    if (urlToken && !tokens.includes(urlToken)) {
        tokens.unshift(urlToken);
    }

    tokens = [...new Set(
        tokens.filter(token =>
            typeof token === "string" &&
            token.trim().length > 0
        )
    )].slice(0, 100);

    try {
        localStorage.setItem(
            "jobnexApplicationTokens",
            JSON.stringify(tokens)
        );
    } catch (error) {
        console.warn("Could not save application tokens.");
    }

    return tokens;
}

function normalizeStatus(status) {
    const value = String(status || "Pending").toLowerCase();

    if (value === "processing") return "processing";
    if (value === "accepted") return "accepted";
    if (value === "rejected") return "rejected";

    return "pending";
}

function statusInfo(status) {
    const key = normalizeStatus(status);

    const map = {
        pending: {
            label: "Pending",
            icon: "◷",
            color: "#fbbf24",
            message: "Your application has been submitted and is waiting for review.",
            progress: 0
        },

        processing: {
            label: "Processing",
            icon: "↻",
            color: "#60a5fa",
            message: "Your application is being reviewed. Please check again for updates.",
            progress: 34
        },

        accepted: {
            label: "Accepted",
            icon: "✓",
            color: "#34d399",
            message: "Your application has been accepted. Check any available contractor details below.",
            progress: 86
        },

        rejected: {
            label: "Rejected",
            icon: "×",
            color: "#fb7185",
            message: "The application was not accepted. You can continue exploring other opportunities.",
            progress: 0
        }
    };

    return map[key];
}

async function fetchApplication(token) {
    try {
        const response = await fetch(
            STATUS_ENDPOINT + encodeURIComponent(token),
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok || !data.success) {
            return {
                token,
                success: false,
                message: data.message || "Status could not be retrieved."
            };
        }

        return {
            ...data,
            token,
            success: true
        };

    } catch (error) {
        return {
            token,
            success: false,
            message: "Unable to connect. Check your internet connection and try again."
        };
    }
}

function getJobDetails(app) {
    const job = app.job && typeof app.job === "object"
        ? app.job
        : {};

    return {
        title: job.jobTitle || app.preferredJob || "Job Application",
        company: job.companyName || "Company details unavailable",
        location: job.companyLocation || app.preferredLocation || "Location not specified"
    };
}

function progressHTML(status) {
    const key = normalizeStatus(status);
    const info = statusInfo(status);

    if (key === "rejected") {
        return `
            <div class="progress-rejected">
                <strong>Application closed</strong><br>
                This application has been marked as rejected.
                You can explore other available jobs on JOBNEX.
            </div>
        `;
    }

    const steps = [
        { label: "Submitted", threshold: 0 },
        { label: "Under Review", threshold: 1 },
        { label: "Processing", threshold: 2 },
        { label: "Decision", threshold: 3 }
    ];

    let activeStep = 0;

    if (key === "processing") activeStep = 2;
    if (key === "accepted") activeStep = 3;

    const width = [0, 29, 57, 86][activeStep];

    return `
        <div class="progress-track"
             style="--status-color:${info.color};--progress-width:${width}%">

            <div class="progress-fill"></div>

            ${steps.map((step, index) => {
                const completed = index < activeStep;
                const current = index === activeStep;

                return `
                    <div class="progress-step
                        ${completed ? "completed" : ""}
                        ${current ? "current" : ""}">

                        <span class="progress-node">
                            ${completed ? "✓" : current ? "•" : ""}
                        </span>

                        <span class="progress-label">
                            ${escapeHTML(step.label)}
                        </span>

                    </div>
                `;
            }).join("")}

        </div>
    `;
}

function contractorHTML(app) {
    if (normalizeStatus(app.status) !== "accepted") {
        return "";
    }

    const contractor = app.contractor || {};

    if (!contractor.contractorName && !contractor.mobile) {
        return `
            <div class="accepted-banner">
                <h4>✓ Application Accepted</h4>
                <p>
                    Your application has been accepted.
                    Contractor contact details are not available yet.
                </p>
            </div>
        `;
    }

    const mobile = String(contractor.mobile || "");

    // Only create a tel link for a plausible phone-number string.
    const telLink = /^[+\d][\d\s()-]{5,24}$/.test(mobile)
        ? `tel:${mobile.replace(/[^\d+]/g, "")}`
        : "";

    return `
        <div class="accepted-banner">
            <h4>✓ Application Accepted</h4>

            <p>
                <strong>Contractor:</strong>
                ${escapeHTML(contractor.contractorName || "Not available")}
            </p>

            <p>
                <strong>Mobile:</strong>
                ${
                    telLink
                        ? `<a href="${escapeHTML(telLink)}">${escapeHTML(mobile)}</a>`
                        : escapeHTML(mobile || "Not available")
                }
            </p>
        </div>
    `;
}

function renderApplication(app, index) {
    if (!app.success) {
        return `
            <article class="application-card"
                data-status="error"
                style="--status-color:#fb7185">

                <div class="card-accent"></div>

                <div class="card-content error-card">
                    <h3>Application ${index + 1}</h3>

                    <p>${escapeHTML(app.message)}</p>

                    <button type="button" data-retry>
                        Try Again
                    </button>

                </div>
            </article>
        `;
    }

    const key = normalizeStatus(app.status);
    const info = statusInfo(app.status);
    const job = getJobDetails(app);

    return `
        <article class="application-card"
            data-status="${key}"
            style="--status-color:${info.color}">

            <div class="card-accent"></div>

            <div class="card-content">

                <div class="card-top">

                    <div class="job-icon" aria-hidden="true">▤</div>

                    <div class="card-heading">

                        <div class="application-number">
                            APPLICATION ${index + 1}
                        </div>

                        <h3 class="job-title">
                            ${escapeHTML(job.title)}
                        </h3>

                    </div>

                    <span class="status-badge badge-${key}">
                        ${info.icon} ${escapeHTML(info.label)}
                    </span>

                </div>


                <div class="company-line">

                    <span>▣ ${escapeHTML(job.company)}</span>

                    <span class="separator">•</span>

                    <span>⌖ ${escapeHTML(job.location)}</span>

                </div>


                <div class="info-grid">

                    <div class="info-item">

                        <div class="info-label">
                            <span>◷</span>
                            CURRENT STATUS
                        </div>

                        <div class="info-value">
                            ${escapeHTML(info.label)}
                        </div>

                    </div>


                    <div class="info-item">

                        <div class="info-label">
                            <span>↗</span>
                            TRACKING
                        </div>

                        <div class="info-value">
                            Application ${index + 1}
                        </div>

                    </div>

                </div>


                <div class="status-panel">

                    <div class="status-panel-heading">

                        <strong>Recruitment Progress</strong>

                        <span>${escapeHTML(info.label)}</span>

                    </div>

                    ${progressHTML(app.status)}

                    <p class="status-message">
                        ${escapeHTML(info.message)}
                    </p>

                </div>


                ${contractorHTML(app)}


                <details class="tracking-details">

                    <summary>View tracking information</summary>

                    <div class="tracking-content">

                        <p>
                            <strong>Tracking Token</strong><br>
                            ${escapeHTML(app.token)}
                        </p>

                        <p>
                            Keep this token private. It is used to retrieve
                            this application's status.
                        </p>

                        <button type="button"
                            class="copy-button"
                            data-copy-token="${escapeHTML(app.token)}">
                            Copy Tracking Token
                        </button>

                    </div>

                </details>

            </div>

        </article>
    `;
}

function updateStats(applications) {
    const valid = applications.filter(app => app.success);

    const count = key => valid.filter(
        app => normalizeStatus(app.status) === key
    ).length;

    $("totalApplications").textContent = applications.length;
    $("pendingApplications").textContent =
        count("pending") + count("processing");

    $("acceptedApplications").textContent = count("accepted");
    $("rejectedApplications").textContent = count("rejected");

    $("filterAllCount").textContent = applications.length;
    $("filterPendingCount").textContent = count("pending");
    $("filterProcessingCount").textContent = count("processing");
    $("filterAcceptedCount").textContent = count("accepted");
    $("filterRejectedCount").textContent = count("rejected");
}

function renderEmptyState() {
    statusArea.innerHTML = `
        <div class="empty-state">

            <div class="empty-icon">▤</div>

            <h3>No applications found</h3>

            <p>
                Your application list is empty.
                Once you apply for a job, your application will appear here.
            </p>

            <a class="empty-button" href="index.html">
                Explore Available Jobs <span>→</span>
            </a>

        </div>
    `;

    updateStats([]);

    $("lastUpdated").textContent = "No saved applications";
}

function applyFilter(filter) {
    state.activeFilter = filter;

    document.querySelectorAll(".filter-button").forEach(button => {
        button.classList.toggle(
            "active",
            button.dataset.filter === filter
        );
    });

    const cards = statusArea.querySelectorAll(".application-card");

    let visible = 0;

    cards.forEach(card => {
        const matches =
            filter === "all" || card.dataset.status === filter;

        card.hidden = !matches;

        if (matches) visible++;
    });

    let emptyMessage = statusArea.querySelector(".no-filter-results");

    if (visible === 0 && cards.length > 0) {
        if (!emptyMessage) {
            emptyMessage = document.createElement("div");
            emptyMessage.className = "no-filter-results";
            statusArea.appendChild(emptyMessage);
        }

        emptyMessage.textContent =
            `No applications found for the "${filter}" filter.`;

    } else if (emptyMessage) {
        emptyMessage.remove();
    }
}

async function copyToken(token, button) {
    try {
        await navigator.clipboard.writeText(token);

        button.textContent = "Copied ✓";

        window.setTimeout(() => {
            button.textContent = "Copy Tracking Token";
        }, 1800);

    } catch (error) {
        window.prompt("Copy your tracking token:", token);
    }
}

function bindEvents() {
    document.querySelectorAll(".filter-button").forEach(button => {
        button.addEventListener("click", () => {
            applyFilter(button.dataset.filter);
        });
    });

    statusArea.addEventListener("click", event => {
        const retry = event.target.closest("[data-retry]");

        if (retry) {
            loadApplications();
            return;
        }

        const copyButton = event.target.closest("[data-copy-token]");

        if (copyButton) {
            copyToken(copyButton.dataset.copyToken, copyButton);
        }
    });

    $("refreshApplications")?.addEventListener(
        "click",
        loadApplications
    );
}

async function loadApplications() {
    if (state.loading) return;

    state.loading = true;

    const refreshButton = $("refreshApplications");

    if (refreshButton) {
        refreshButton.disabled = true;
    }

    const tokens = getTokens();

    if (!tokens.length) {
        renderEmptyState();

        state.loading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }

        return;
    }

    statusArea.innerHTML = `
        <div class="loading-state">

            <div class="loading-spinner"></div>

            <h3>Updating application statuses</h3>

            <p>Fetching the latest available information.</p>

        </div>
    `;

    try {
        const results = await Promise.all(
            tokens.map(fetchApplication)
        );

        state.applications = results;

        updateStats(results);

        statusArea.innerHTML = `
            <div class="application-list">
                ${results.map(renderApplication).join("")}
            </div>
        `;

        $("lastUpdated").textContent =
            "Updated at " +
            new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit"
            });

        applyFilter(state.activeFilter);

    } catch (error) {
        statusArea.innerHTML = `
            <div class="error-card">

                <h3>Unable to load applications</h3>

                <p>
                    Please check your connection and try again.
                </p>

                <button type="button" id="retryApplications">
                    Try Again
                </button>

            </div>
        `;

        $("retryApplications")?.addEventListener(
            "click",
            loadApplications
        );

    } finally {
        state.loading = false;

        if (refreshButton) {
            refreshButton.disabled = false;
        }
    }
}

$("currentYear").textContent = new Date().getFullYear();

bindEvents();

loadApplications();

state.timer = window.setInterval(() => {
    if (!document.hidden) {
        loadApplications();
    }
}, 30000);

})();
