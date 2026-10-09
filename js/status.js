(() => {
"use strict";

const API_BASE = (
    window.API_URL ||
    "https://industrial-contractor-job-network.onrender.com/api"
).replace(/\/+$/, "");

const STATUS_URL = `${API_BASE}/public-worker/status/`;

const statusArea = document.getElementById("statusArea");

if (!statusArea) {
    console.error("JOBNEX: #statusArea element not found.");
    return;
}

let loading = false;

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getTokens() {
    const key = "jobnexApplicationTokens";
    let tokens = [];

    try {
        const stored = JSON.parse(localStorage.getItem(key) || "[]");

        if (Array.isArray(stored)) {
            tokens = stored;
        }
    } catch (error) {
        tokens = [];
    }

    // Purane version ka token bhi preserve karein
    const legacyKeys = [
        "contractorHubTrackingToken",
        "publicWorkerTrackingToken",
        "trackingToken"
    ];

    legacyKeys.forEach(storageKey => {
        const token = localStorage.getItem(storageKey);

        if (token && !tokens.includes(token)) {
            tokens.push(token);
        }
    });

    // URL mein token ho toh use bhi include karein
    const urlToken = new URLSearchParams(
        window.location.search
    ).get("token");

    if (urlToken && !tokens.includes(urlToken)) {
        tokens.unshift(urlToken);
    }

    // Empty aur duplicate tokens hata dein
    tokens = [...new Set(
        tokens.filter(token =>
            typeof token === "string" && token.trim()
        )
    )].slice(0, 100);

    localStorage.setItem(key, JSON.stringify(tokens));

    return tokens;
}

function getStatusInfo(status) {
    const normalized = String(status || "Pending").toLowerCase();

    const map = {
        pending: {
            label: "Pending",
            color: "#f59e0b",
            icon: "⏳",
            description: "Aapki application review hone ka intezar kar rahi hai."
        },
        processing: {
            label: "Processing",
            color: "#3b82f6",
            icon: "🔄",
            description: "Aapki application par kaam chal raha hai."
        },
        accepted: {
            label: "Accepted",
            color: "#10b981",
            icon: "✅",
            description: "Aapki application accept kar li gayi hai."
        },
        rejected: {
            label: "Rejected",
            color: "#ef4444",
            icon: "❌",
            description: "Yeh application accept nahi hui."
        }
    };

    return map[normalized] || map.pending;
}

async function fetchApplication(token) {
    try {
        const response = await fetch(
            STATUS_URL + encodeURIComponent(token),
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
                message: data.message || "Application status nahi mil saka."
            };
        }

        return {
            token,
            success: true,
            ...data
        };

    } catch (error) {
        return {
            token,
            success: false,
            message: "Internet connection check karke dobara try karein."
        };
    }
}

function renderApplication(application, index) {
    if (!application.success) {
        return `
            <article class="jnx-app-card jnx-app-error">
                <div class="jnx-app-card-top">
                    <span class="jnx-app-number">
                        Application ${index + 1}
                    </span>

                    <span class="jnx-app-badge jnx-error-badge">
                        Unavailable
                    </span>
                </div>

                <p class="jnx-app-message">
                    ${escapeHTML(application.message)}
                </p>

                <button
                    type="button"
                    class="jnx-retry-btn"
                    data-retry="true"
                >
                    Retry
                </button>
            </article>
        `;
    }

    const status = getStatusInfo(application.status);
    const job = application.job || {};

    const jobTitle = job.jobTitle || application.preferredJob || "Job Application";
    const company = job.companyName || "Company details unavailable";
    const location = job.companyLocation || application.preferredLocation || "Location not specified";

    const contractor = application.contractor || {};

    return `
        <article class="jnx-app-card">
            <div class="jnx-app-card-top">
                <span class="jnx-app-number">
                    Application ${index + 1}
                </span>

                <span
                    class="jnx-app-badge"
                    style="--badge-color:${status.color}"
                >
                    ${status.icon} ${escapeHTML(status.label)}
                </span>
            </div>

            <h3 class="jnx-app-job-title">
                ${escapeHTML(jobTitle)}
            </h3>

            <div class="jnx-app-info">
                <div class="jnx-info-row">
                    <span class="jnx-info-icon">🏢</span>
                    <div>
                        <small>Company</small>
                        <p>${escapeHTML(company)}</p>
                    </div>
                </div>

                <div class="jnx-info-row">
                    <span class="jnx-info-icon">📍</span>
                    <div>
                        <small>Location</small>
                        <p>${escapeHTML(location)}</p>
                    </div>
                </div>
            </div>

            <div class="jnx-app-status-box">
                <span class="jnx-status-dot"
                      style="background:${status.color}"></span>

                <p>${escapeHTML(status.description)}</p>
            </div>

            ${
                application.status === "Accepted" &&
                (contractor.contractorName || contractor.mobile)
                ? `
                    <div class="jnx-contractor-box">
                        <h4>Contractor Details</h4>

                        <p>
                            <strong>Name:</strong>
                            ${escapeHTML(contractor.contractorName || "Not available")}
                        </p>

                        <p>
                            <strong>Mobile:</strong>
                            ${
                                contractor.mobile
                                ? `<a href="tel:${escapeHTML(contractor.mobile)}">${escapeHTML(contractor.mobile)}</a>`
                                : "Not available"
                            }
                        </p>
                    </div>
                `
                : ""
            }

            <details class="jnx-tracking-details">
                <summary>Tracking details</summary>
                <p>
                    <strong>Tracking ID:</strong>
                    <span>${escapeHTML(application.token)}</span>
                </p>
            </details>
        </article>
    `;
}

function renderDashboard(applications) {
    const successfulCount = applications.filter(
        app => app.success
    ).length;

    const pendingCount = applications.filter(
        app => app.success &&
            ["Pending", "Processing"].includes(app.status)
    ).length;

    const acceptedCount = applications.filter(
        app => app.success && app.status === "Accepted"
    ).length;

    statusArea.innerHTML = `
        <section class="jnx-dashboard">

            <header class="jnx-dashboard-header">
                <div>
                    <span class="jnx-eyebrow">JOBNEX CAREER CENTER</span>
                    <h2>My Applications</h2>
                    <p>Apni sabhi job applications ka status ek jagah dekhein.</p>
                </div>

                <button
                    type="button"
                    class="jnx-refresh-btn"
                    id="jnxRefresh"
                >
                    ↻ Refresh
                </button>
            </header>

            <div class="jnx-summary-grid">
                <div class="jnx-summary-card">
                    <span>Total Applications</span>
                    <strong>${applications.length}</strong>
                </div>

                <div class="jnx-summary-card">
                    <span>Under Review</span>
                    <strong>${pendingCount}</strong>
                </div>

                <div class="jnx-summary-card">
                    <span>Accepted</span>
                    <strong>${acceptedCount}</strong>
                </div>
            </div>

            ${
                successfulCount === 0
                ? `
                    <div class="jnx-empty-state">
                        <div class="jnx-empty-icon">📋</div>
                        <h3>Applications load nahi ho sakin</h3>
                        <p>Internet check karein aur Refresh par click karein.</p>
                    </div>
                `
                : `
                    <div class="jnx-app-list">
                        ${applications.map(renderApplication).join("")}
                    </div>
                `
            }

            <footer class="jnx-dashboard-footer">
                <span>JOBNEX • Application Tracking</span>
                <span>Auto-refresh: 30 seconds</span>
            </footer>
        </section>

        <style>
            #statusArea {
                width: 100%;
                box-sizing: border-box;
            }

            .jnx-dashboard {
                --jnx-text: #e5e7eb;
                --jnx-muted: #94a3b8;
                --jnx-border: rgba(148,163,184,.18);
                max-width: 1000px;
                margin: 20px auto;
                padding: 22px;
                color: var(--jnx-text);
                background: #0b1120;
                border: 1px solid var(--jnx-border);
                border-radius: 24px;
                box-sizing: border-box;
                font-family: Inter, system-ui, sans-serif;
            }

            .jnx-dashboard-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 16px;
                flex-wrap: wrap;
                margin-bottom: 24px;
            }

            .jnx-eyebrow {
                color: #38bdf8;
                font-size: 11px;
                font-weight: 800;
                letter-spacing: 2px;
            }

            .jnx-dashboard-header h2 {
                margin: 8px 0;
                font-size: clamp(24px, 5vw, 34px);
                color: #fff;
            }

            .jnx-dashboard-header p {
                margin: 0;
                color: var(--jnx-muted);
                line-height: 1.6;
            }

            .jnx-refresh-btn,
            .jnx-retry-btn {
                padding: 11px 16px;
                border: 1px solid #334155;
                border-radius: 12px;
                background: #172033;
                color: #fff;
                font-weight: 700;
                cursor: pointer;
            }

            .jnx-summary-grid {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
                gap: 12px;
                margin-bottom: 24px;
            }

            .jnx-summary-card {
                padding: 18px;
                border: 1px solid var(--jnx-border);
                border-radius: 16px;
                background: #111b2d;
            }

            .jnx-summary-card span {
                display: block;
                color: var(--jnx-muted);
                font-size: 12px;
                line-height: 1.5;
            }

            .jnx-summary-card strong {
                display: block;
                margin-top: 8px;
                color: #fff;
                font-size: 28px;
            }

            .jnx-app-list {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 16px;
            }

            .jnx-app-card {
                min-width: 0;
                padding: 20px;
                background: linear-gradient(145deg, #131e31, #0f1728);
                border: 1px solid var(--jnx-border);
                border-radius: 18px;
                box-sizing: border-box;
            }

            .jnx-app-card-top {
                display: flex;
                justify-content: space-between;
                align-items: center;
                flex-wrap: wrap;
                gap: 10px;
            }

            .jnx-app-number {
                color: var(--jnx-muted);
                font-size: 12px;
                font-weight: 700;
            }

            .jnx-app-badge {
                color: var(--badge-color, #f59e0b);
                background: color-mix(in srgb, var(--badge-color, #f59e0b) 12%, transparent);
                border: 1px solid color-mix(in srgb, var(--badge-color, #f59e0b) 35%, transparent);
                padding: 7px 10px;
                border-radius: 30px;
                font-size: 12px;
                font-weight: 800;
            }

            .jnx-app-job-title {
                color: #fff;
                font-size: 21px;
                line-height: 1.4;
                overflow-wrap: anywhere;
                margin: 18px 0;
            }

            .jnx-app-info {
                display: grid;
                gap: 14px;
            }

            .jnx-info-row {
                display: flex;
                gap: 12px;
                align-items: flex-start;
            }

            .jnx-info-icon {
                width: 36px;
                height: 36px;
                flex-shrink: 0;
                display: grid;
                place-items: center;
                background: #1e293b;
                border-radius: 11px;
            }

            .jnx-info-row small {
                color: var(--jnx-muted);
                font-size: 11px;
            }

            .jnx-info-row p {
                margin: 4px 0 0;
                color: #e2e8f0;
                overflow-wrap: anywhere;
            }

            .jnx-app-status-box {
                display: flex;
                gap: 10px;
                align-items: flex-start;
                margin-top: 20px;
                padding: 13px;
                background: #0b1220;
                border-radius: 12px;
            }

            .jnx-app-status-box p {
                margin: 0;
                color: #cbd5e1;
                font-size: 13px;
                line-height: 1.6;
            }

            .jnx-status-dot {
                width: 9px;
                height: 9px;
                flex-shrink: 0;
                margin-top: 5px;
                border-radius: 50%;
            }

            .jnx-contractor-box {
                margin-top: 16px;
                padding: 15px;
                border: 1px solid rgba(16,185,129,.3);
                background: rgba(16,185,129,.07);
                border-radius: 12px;
            }

            .jnx-contractor-box h4 {
                margin: 0 0 12px;
                color: #6ee7b7;
            }

            .jnx-contractor-box p {
                margin: 7px 0;
                color: #d1fae5;
                overflow-wrap: anywhere;
            }

            .jnx-contractor-box a {
                color: #6ee7b7;
            }

            .jnx-tracking-details {
                margin-top: 16px;
                color: var(--jnx-muted);
                font-size: 12px;
            }

            .jnx-tracking-details summary {
                cursor: pointer;
            }

            .jnx-tracking-details span {
                display: block;
                margin-top: 5px;
                overflow-wrap: anywhere;
                color: #cbd5e1;
            }

            .jnx-empty-state {
                text-align: center;
                padding: 40px 15px;
                border: 1px dashed #334155;
                border-radius: 18px;
            }

            .jnx-empty-icon {
                font-size: 38px;
            }

            .jnx-empty-state h3 {
                color: #fff;
            }

            .jnx-empty-state p {
                color: var(--jnx-muted);
                line-height: 1.7;
            }

            .jnx-dashboard-footer {
                display: flex;
                justify-content: space-between;
                flex-wrap: wrap;
                gap: 8px;
                margin-top: 24px;
                padding-top: 16px;
                border-top: 1px solid var(--jnx-border);
                color: #64748b;
                font-size: 11px;
            }

            @media (max-width: 650px) {
                .jnx-dashboard {
                    padding: 15px;
                    border-radius: 18px;
                }

                .jnx-summary-grid {
                    gap: 8px;
                }

                .jnx-summary-card {
                    padding: 12px 10px;
                }

                .jnx-summary-card span {
                    font-size: 10px;
                }

                .jnx-summary-card strong {
                    font-size: 23px;
                }

                .jnx-app-list {
                    grid-template-columns: 1fr;
                }

                .jnx-app-card {
                    padding: 17px;
                }

                .jnx-dashboard-header {
                    align-items: flex-start;
                }
            }
        </style>
    `;

    document.getElementById("jnxRefresh")?.addEventListener(
        "click",
        loadApplications
    );

    statusArea.querySelectorAll("[data-retry]").forEach(button => {
        button.addEventListener("click", loadApplications);
    });
}

async function loadApplications() {
    if (loading) return;

    loading = true;

    const tokens = getTokens();

    if (!tokens.length) {
        statusArea.innerHTML = `
            <div style="
                max-width:650px;
                margin:30px auto;
                padding:30px 20px;
                text-align:center;
                background:#0b1120;
                color:#e5e7eb;
                border:1px solid #334155;
                border-radius:20px;
                font-family:system-ui,sans-serif;
            ">
                <div style="font-size:42px">📋</div>
                <h2>My Applications</h2>
                <p style="color:#94a3b8;line-height:1.7">
                    Abhi koi saved application nahi mili.
                    Job ke liye apply karne ke baad aapki application
                    yahan dikhai degi.
                </p>
                <a href="index.html" style="
                    display:inline-block;
                    margin-top:10px;
                    padding:12px 20px;
                    background:#0284c7;
                    color:#fff;
                    text-decoration:none;
                    border-radius:10px;
                    font-weight:700;
                ">Find Jobs</a>
            </div>
        `;

        loading = false;
        return;
    }

    statusArea.innerHTML = `
        <div style="
            padding:30px;
            text-align:center;
            color:#94a3b8;
            font-family:system-ui,sans-serif;
        ">
            Applications load ho rahi hain...
        </div>
    `;

    try {
        const applications = await Promise.all(
            tokens.map(fetchApplication)
        );

        renderDashboard(applications);
    } catch (error) {
        statusArea.innerHTML = `
            <p style="padding:20px;color:#ef4444">
                Applications load nahi ho sakin. Dobara try karein.
            </p>
            <button id="jnxRetryLoad" type="button">Retry</button>
        `;

        document.getElementById("jnxRetryLoad")?.addEventListener(
            "click",
            loadApplications
        );
    } finally {
        loading = false;
    }
}

loadApplications();

window.setInterval(loadApplications, 30000);

})();
