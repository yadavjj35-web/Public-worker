"use strict";

const statusArea = document.getElementById("statusArea");

let statusLoading = false;

/* =========================================
   GET TRACKING TOKEN
========================================= */

function getTrackingToken() {
    return (
        localStorage.getItem("contractorHubTrackingToken") ||
        localStorage.getItem("publicWorkerTrackingToken") ||
        localStorage.getItem("trackingToken") ||
        new URLSearchParams(window.location.search).get("token") ||
        ""
    ).trim();
}

/* =========================================
   LOAD APPLICATION STATUS
========================================= */

async function loadStatus() {
    if (statusLoading) return;

    const token = getTrackingToken();

    if (!token) {
        statusArea.innerHTML = `
            <div class="empty">
                <h3>Application Not Found</h3>
                <p>
                    Aapka tracking token nahi mila.
                    Kripya job ke liye application submit karein.
                </p>
                <a href="index.html" class="primary button-link">
                    Find Jobs
                </a>
            </div>
        `;
        return;
    }

    if (typeof API_URL === "undefined") {
        statusArea.innerHTML = `
            <div class="error">
                API configuration nahi mili.
                Kripya js/config.js check karein.
            </div>
        `;
        return;
    }

    statusLoading = true;

    try {
        const response = await fetch(
            `${API_URL}/public-worker/status/${encodeURIComponent(token)}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Application status load nahi ho saka."
            );
        }

        if (data.success === false) {
            throw new Error(
                data.message || "Application nahi mili."
            );
        }

        // Backend direct object ya nested application bhej sakta hai.
        const application =
            data.application ||
            data.request ||
            data.data ||
            data;

        if (
            !application ||
            typeof application !== "object" ||
            Array.isArray(application)
        ) {
            throw new Error("Server se valid application data nahi mila.");
        }

        renderStatus(application);

    } catch (error) {
        console.error("APPLICATION STATUS ERROR:", error);

        statusArea.innerHTML = `
            <div class="error">
                <h3>Status Load Nahi Hua</h3>
                <p>${escapeHtml(error.message)}</p>
                <button
                    type="button"
                    class="primary"
                    onclick="loadStatus()"
                >
                    Try Again
                </button>
            </div>
        `;
    } finally {
        statusLoading = false;
    }
}

/* =========================================
   RENDER APPLICATION STATUS
========================================= */

function renderStatus(data) {
    const status = String(data.status || "Pending");

    const workerName = data.workerName || "Worker";
    const workerMobile = data.workerMobile || "";

    const job = data.job || data.jobId || {};

    const jobTitle =
        typeof job === "object"
            ? job.jobTitle || data.preferredJob || "Job Details"
            : data.preferredJob || "Job Details";

    const companyName =
        typeof job === "object"
            ? job.companyName || ""
            : "";

    const companyLocation =
        typeof job === "object"
            ? job.companyLocation || ""
            : data.preferredLocation || "";

    const steps = [
        "Pending",
        "Processing",
        "Accepted"
    ];

    const normalizedStatus = status.toLowerCase();

    const contractor =
        data.contractor ||
        data.contractorId ||
        null;

    let contractorHtml = "";

    if (
        normalizedStatus === "accepted" &&
        contractor &&
        typeof contractor === "object"
    ) {
        const contractorName =
            contractor.contractorName || "Contractor";

        const contractorMobile =
            contractor.mobile || "";

        contractorHtml = `
            <div class="contractor-box">
                <h3>Contractor Details</h3>

                <p>
                    <strong>Name:</strong>
                    ${escapeHtml(contractorName)}
                </p>

                ${
                    contractorMobile
                        ? `
                            <p>
                                <strong>Mobile:</strong>
                                <a href="tel:${escapeHtml(contractorMobile)}">
                                    ${escapeHtml(contractorMobile)}
                                </a>
                            </p>
                        `
                        : ""
                }
            </div>
        `;
    }

    const statusFlowHtml = steps.map((step, index) => {
        let active = false;

        if (normalizedStatus === "pending") {
            active = index === 0;
        } else if (normalizedStatus === "processing") {
            active = index <= 1;
        } else if (normalizedStatus === "accepted") {
            active = true;
        }

        return `
            ${
                index > 0
                    ? `<div class="arrow">↓</div>`
                    : ""
            }

            <div class="status-step ${active ? "active" : ""}">
                <span>${active ? "✓" : "○"}</span>
                <strong>${step}</strong>
            </div>
        `;
    }).join("");

    let resultMessage = "";

    if (normalizedStatus === "rejected") {
        resultMessage = `
            <div class="error">
                <h3>Application Rejected</h3>
                <p>
                    Aapki application reject kar di gayi hai.
                </p>
                ${
                    data.adminNote || data.contractorNote
                        ? `<p>${escapeHtml(data.adminNote || data.contractorNote)}</p>`
                        : ""
                }
            </div>
        `;
    } else if (normalizedStatus === "accepted") {
        resultMessage = `
            <div class="success">
                <h3>Application Accepted</h3>
                <p>Aapki application accept ho gayi hai.</p>
            </div>
        `;
    } else if (normalizedStatus === "processing") {
        resultMessage = `
            <div class="success">
                <h3>Application Processing</h3>
                <p>Aapki application par kaam chal raha hai.</p>
            </div>
        `;
    } else if (normalizedStatus === "pending") {
        resultMessage = `
            <div class="status-message">
                <p>Aapki application review hone ka intezar kar rahi hai.</p>
            </div>
        `;
    } else {
        resultMessage = `
            <div class="status-message">
                <strong>Current Status:</strong>
                ${escapeHtml(status)}
            </div>
        `;
    }

    statusArea.innerHTML = `
        <div class="worker-info">
            <h3>${escapeHtml(workerName)}</h3>
            <p>
                <strong>Mobile:</strong>
                ${escapeHtml(workerMobile)}
            </p>
        </div>

        <div class="job-info">
            <h3>${escapeHtml(jobTitle)}</h3>

            ${
                companyName
                    ? `<p>${escapeHtml(companyName)}</p>`
                    : ""
            }

            ${
                companyLocation
                    ? `<p>📍 ${escapeHtml(companyLocation)}</p>`
                    : ""
            }
        </div>

        <div class="application-status">
            <h3>Application Status</h3>
            <div class="status-flow">
                ${statusFlowHtml}
            </div>
        </div>

        ${resultMessage}
        ${contractorHtml}

        <p class="last-updated">
            Status automatically refresh hota rahega.
        </p>
    `;
}

/* =========================================
   HTML SAFETY
========================================= */

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/* =========================================
   INITIAL LOAD + AUTO REFRESH
========================================= */

loadStatus();

setInterval(loadStatus, 30000);
