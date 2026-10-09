
(() => {
  "use strict";

  // ==========================================
  // JOBNEX - ALL JOBS LISTING
  // Premium Loader + All Available Jobs
  // ==========================================

  const API_URL =
    "https://industrial-contractor-job-network.onrender.com/api/jobs/public-all";

  const LIMIT = 10;

  const grid = document.getElementById("jnxJobsGrid");
  const count = document.getElementById("jnxJobsCount");
  const moreBtn = document.getElementById("jnxMoreJobsBtn");
  const message = document.getElementById("jnxJobsMessage");

  if (!grid || !count || !moreBtn || !message) {
    console.error("JOBNEX: Required HTML elements nahi mile.");
    return;
  }

  // ==========================================
  // CREATE LOADER AUTOMATICALLY
  // HTML/CSS FILE CHANGE KARNE KI ZAROORAT NAHI
  // ==========================================

  const loaderStyle = document.createElement("style");

  loaderStyle.textContent = `
    #jnxAutoLoader {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      background: #080d18;
      color: #f8fafc;
      font-family: system-ui, -apple-system, BlinkMacSystemFont,
                   "Segoe UI", sans-serif;
      opacity: 1;
      visibility: visible;
      transition: opacity .35s ease, visibility .35s ease;
    }

    #jnxAutoLoader.jnx-loader-hide {
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
    }

    #jnxAutoLoader .jnx-loader-box {
      width: 100%;
      max-width: 430px;
      text-align: center;
    }

    #jnxAutoLoader .jnx-loader-brand {
      margin-bottom: 34px;
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 2px;
      color: #f8fafc;
    }

    #jnxAutoLoader .jnx-loader-brand span {
      color: #60a5fa;
    }

    #jnxAutoLoader .jnx-loader-spinner {
      width: 55px;
      height: 55px;
      margin: 0 auto 26px;
      border: 4px solid #1e293b;
      border-top-color: #60a5fa;
      border-right-color: #818cf8;
      border-radius: 50%;
      animation: jnxLoaderSpin .8s linear infinite;
    }

    #jnxAutoLoader .jnx-loader-heading {
      margin: 0 0 10px;
      color: #f8fafc;
      font-size: 22px;
      font-weight: 750;
    }

    #jnxAutoLoader .jnx-loader-description {
      max-width: 340px;
      margin: 0 auto 25px;
      color: #94a3b8;
      font-size: 14px;
      line-height: 1.8;
    }

    #jnxAutoLoader .jnx-loader-track {
      width: 100%;
      height: 5px;
      margin-bottom: 17px;
      overflow: hidden;
      border-radius: 20px;
      background: #1e293b;
    }

    #jnxAutoLoader .jnx-loader-bar {
      width: 35%;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, #60a5fa, #818cf8);
      animation: jnxLoaderProgress 1.4s ease-in-out infinite;
    }

    #jnxAutoLoader .jnx-loader-status {
      color: #64748b;
      font-size: 12px;
    }

    #jnxAutoLoader .jnx-loader-error {
      display: none;
      margin-top: 18px;
      color: #fca5a5;
      font-size: 13px;
      line-height: 1.7;
    }

    #jnxAutoLoader .jnx-loader-retry {
      display: none;
      margin: 18px auto 0;
      padding: 11px 23px;
      border: 1px solid #3b82f6;
      border-radius: 10px;
      background: #2563eb;
      color: white;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
    }

    #jnxAutoLoader .jnx-loader-retry:hover {
      background: #1d4ed8;
    }

    #jnxAutoLoader.jnx-loader-failed .jnx-loader-spinner,
    #jnxAutoLoader.jnx-loader-failed .jnx-loader-track {
      display: none;
    }

    #jnxAutoLoader.jnx-loader-failed .jnx-loader-error,
    #jnxAutoLoader.jnx-loader-failed .jnx-loader-retry {
      display: block;
    }

    @keyframes jnxLoaderSpin {
      to { transform: rotate(360deg); }
    }

    @keyframes jnxLoaderProgress {
      0% { transform: translateX(-110%); }
      100% { transform: translateX(310%); }
    }

    @media (prefers-reduced-motion: reduce) {
      #jnxAutoLoader .jnx-loader-spinner,
      #jnxAutoLoader .jnx-loader-bar {
        animation-duration: 3s;
      }
    }
  `;

  document.head.appendChild(loaderStyle);

  const pageLoader = document.createElement("div");

  pageLoader.id = "jnxAutoLoader";

  pageLoader.innerHTML = `
    <div class="jnx-loader-box">

      <div class="jnx-loader-brand">
        JOB<span>NEX</span>
      </div>

      <div class="jnx-loader-spinner"></div>

      <h2 class="jnx-loader-heading">
        Jobs load ho rahi hain...
      </h2>

      <p class="jnx-loader-description">
        Kripya intezar karein. Aapke liye available jobs
        aur unki details taiyar ki ja rahi hain.
      </p>

      <div class="jnx-loader-track">
        <div class="jnx-loader-bar"></div>
      </div>

      <div class="jnx-loader-status" id="jnxAutoLoaderStatus">
        Server se connect ho raha hai...
      </div>

      <div class="jnx-loader-error" id="jnxAutoLoaderError"></div>

      <button
        type="button"
        class="jnx-loader-retry"
        id="jnxAutoLoaderRetry"
      >
        Dobara Try Karein
      </button>

    </div>
  `;

  document.body.appendChild(pageLoader);

  const loaderStatus =
    document.getElementById("jnxAutoLoaderStatus");

  const loaderError =
    document.getElementById("jnxAutoLoaderError");

  const loaderRetry =
    document.getElementById("jnxAutoLoaderRetry");

  let initialLoadFinished = false;

  function updateLoaderStatus(text) {
    loaderStatus.textContent = text;
  }

  function hideLoader() {
    pageLoader.classList.remove("jnx-loader-failed");
    pageLoader.classList.add("jnx-loader-hide");

    window.setTimeout(() => {
      if (pageLoader.isConnected) {
        pageLoader.remove();
      }

      if (loaderStyle.isConnected) {
        loaderStyle.remove();
      }
    }, 400);
  }

  function showLoaderError(text) {
    pageLoader.classList.add("jnx-loader-failed");

    loaderStatus.textContent = "Connection nahi ho paya.";
    loaderError.textContent = text;
    loaderRetry.style.display = "block";
  }

  // ==========================================
  // PAGINATION STATE
  // ==========================================

  let page = 1;
  let loading = false;
  let hasMore = true;
  let totalLoaded = 0;
  let totalAvailable = null;

  const loadedJobs = [];
  const seen = new Set();

  // ==========================================
  // SAFE HTML
  // ==========================================

  function safe(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[char]);
  }

  // ==========================================
  // JOB DATA HELPERS
  // ==========================================

  function getContractor(job) {
    return job.contractorId &&
      typeof job.contractorId === "object"
      ? job.contractorId
      : {};
  }

  function getTitle(job) {
    return (
      job.jobTitle ||
      job.title ||
      job.position ||
      job.designation ||
      "Job Opportunity"
    );
  }

  function getCompany(job) {
    const contractor = getContractor(job);

    return (
      job.companyName ||
      contractor.companyName ||
      job.contractorName ||
      contractor.contractorName ||
      job.company ||
      "Hiring Company"
    );
  }

  function getLocation(job) {
    const contractor = getContractor(job);

    const locations = [
      job.companyLocation,
      job.plantUnit,
      job.industrialArea,
      job.location,
      job.city,
      job.address,
      job.workLocation,
      contractor.industrialArea,
      contractor.city,
      contractor.location
    ]
      .filter(value =>
        value !== null &&
        value !== undefined &&
        String(value).trim() !== ""
      )
      .map(value => String(value).trim());

    return [...new Set(locations)].join(", ") ||
      "Location details देखें";
  }

  // ==========================================
  // JOB STATUS
  // ==========================================

  function isJobAvailable(job) {
    if (!job) return false;

    const status = String(job.status || "")
      .trim()
      .toLowerCase();

    if (
      job.isClosedByAdmin === true ||
      job.isActive === false
    ) {
      return false;
    }

    if (
      [
        "closed",
        "inactive",
        "expired",
        "filled",
        "cancelled",
        "canceled"
      ].includes(status)
    ) {
      return false;
    }

    if (
      job.workersRemaining !== null &&
      job.workersRemaining !== undefined &&
      Number(job.workersRemaining) <= 0
    ) {
      return false;
    }

    return true;
  }

  // ==========================================
  // SALARY
  // ==========================================

  function getSalary(job) {
    const min = job.salaryMin ?? job.minSalary;
    const max = job.salaryMax ?? job.maxSalary;

    const hasMin =
      min !== null && min !== undefined && min !== "";

    const hasMax =
      max !== null && max !== undefined && max !== "";

    const format = value =>
      Number(value).toLocaleString("en-IN");

    if (hasMin && hasMax) {
      const minNumber = Number(min);
      const maxNumber = Number(max);

      if (minNumber === 0 && maxNumber === 0) {
        return "वेतन कंपनी के नियमानुसार";
      }

      if (minNumber === 0) {
        return "₹" + format(maxNumber) + " तक";
      }

      if (maxNumber === 0) {
        return "₹" + format(minNumber) + "+";
      }

      if (minNumber === maxNumber) {
        return "₹" + format(minNumber);
      }

      return "₹" + format(minNumber) +
        " - ₹" + format(maxNumber);
    }

    if (hasMin && Number(min) > 0) {
      return "₹" + format(min) + "+";
    }

    if (hasMax && Number(max) > 0) {
      return "₹" + format(max) + " तक";
    }

    return job.salary ||
      "वेतन की जानकारी उपलब्ध नहीं";
  }

  // ==========================================
  // EXPERIENCE
  // ==========================================

  function getExperience(job) {
    const min = job.experienceMin ?? job.minExperience;
    const max = job.experienceMax ?? job.maxExperience;

    const hasMin =
      min !== null && min !== undefined && min !== "";

    const hasMax =
      max !== null && max !== undefined && max !== "";

    if (hasMin && hasMax) {
      if (Number(min) === 0 && Number(max) === 0) {
        return "Fresher";
      }

      if (Number(min) === 0) {
        return "0 - " + max + " वर्ष";
      }

      if (Number(min) === Number(max)) {
        return min + " वर्ष";
      }

      return min + " - " + max + " वर्ष";
    }

    if (hasMin) {
      return Number(min) === 0
        ? "Fresher"
        : min + "+ वर्ष";
    }

    if (hasMax) {
      return "अधिकतम " + max + " वर्ष";
    }

    return "जानकारी उपलब्ध नहीं";
  }

  // ==========================================
  // VACANCIES
  // ==========================================

  function getVacancies(job) {
    if (
      job.workersRemaining !== null &&
      job.workersRemaining !== undefined
    ) {
      return Math.max(0, Number(job.workersRemaining));
    }

    if (
      job.vacancies !== null &&
      job.vacancies !== undefined
    ) {
      return job.vacancies;
    }

    if (
      job.workersRequired !== null &&
      job.workersRequired !== undefined
    ) {
      return Math.max(
        0,
        Number(job.workersRequired) -
          Number(job.workersFilled || 0)
      );
    }

    return "जानकारी उपलब्ध नहीं";
  }

  // ==========================================
  // JOB CARD
  // ==========================================

  function renderJob(job) {
    const id = job._id || job.id || job.jobId || "";

    const title = safe(getTitle(job));
    const company = safe(getCompany(job));
    const location = safe(getLocation(job));
    const salary = safe(getSalary(job));

    const qualification = safe(
      job.qualification ||
      job.trade ||
      "निर्दिष्ट नहीं"
    );

    const experience = safe(getExperience(job));
    const vacancies = safe(getVacancies(job));

    const jobType = safe(
      job.jobType || "निर्दिष्ट नहीं"
    );

    const department = safe(
      job.department || "निर्दिष्ट नहीं"
    );

    const status = String(job.status || "")
      .trim()
      .toLowerCase();

    const badge = status === "partially filled"
      ? "Hiring"
      : "Active";

    const detailsURL = id
      ? "job.html?id=" + encodeURIComponent(id)
      : "index.html";

    return `
      <article class="jnx-job-card">

        <div class="jnx-job-top">
          <div>
            <h3 class="jnx-job-title">${title}</h3>
            <p class="jnx-company">🏭 ${company}</p>
          </div>

          <span class="jnx-badge">${badge}</span>
        </div>

        <div class="jnx-job-meta">

          <div class="jnx-meta">
            <small>📍 Location</small>
            <span>${location}</span>
          </div>

          <div class="jnx-meta">
            <small>💰 Salary</small>
            <span>${salary}</span>
          </div>

          <div class="jnx-meta">
            <small>🎓 Qualification</small>
            <span>${qualification}</span>
          </div>

          <div class="jnx-meta">
            <small>🧰 Experience</small>
            <span>${experience}</span>
          </div>

          <div class="jnx-meta">
            <small>👥 Vacancies</small>
            <span>${vacancies}</span>
          </div>

          <div class="jnx-meta">
            <small>💼 Job Type</small>
            <span>${jobType}</span>
          </div>

          <div class="jnx-meta">
            <small>🏢 Department</small>
            <span>${department}</span>
          </div>

        </div>

        <div class="jnx-card-actions">
          <a
            class="jnx-btn jnx-btn-primary"
            href="${safe(detailsURL)}"
          >
            View Details &amp; Apply →
          </a>
        </div>

      </article>
    `;
  }

  // ==========================================
  // DISPLAY JOBS
  // ==========================================

  function renderJobs() {
    if (loadedJobs.length === 0) {
      grid.innerHTML = `
        <div class="jnx-load-state">
          <strong>अभी कोई उपलब्ध नौकरी नहीं मिली।</strong>
          <p>नई लिस्टिंग के लिए बाद में दोबारा जाँचें।</p>
        </div>
      `;
    } else {
      grid.innerHTML = loadedJobs
        .map(renderJob)
        .join("");
    }

    count.textContent =
      totalAvailable !== null
        ? loadedJobs.length + " / " + totalAvailable + " Jobs"
        : loadedJobs.length + " Jobs";
  }

  // ==========================================
  // LOAD JOBS
  // ==========================================

  async function loadJobs() {
    if (loading || !hasMore) return;

    loading = true;

    moreBtn.disabled = true;
    moreBtn.textContent = "⏳ Jobs लोड हो रही हैं...";
    message.textContent = "";

    if (!initialLoadFinished) {
      updateLoaderStatus("Server se jobs ki details mangi ja rahi hain...");
    }

    try {
      const url =
        API_URL +
        "?page=" + page +
        "&limit=" + LIMIT;

      const controller = new AbortController();

      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 25000);

      let response;

      try {
        response = await fetch(url, {
          method: "GET",
          headers: {
            Accept: "application/json"
          },
          signal: controller.signal
        });
      } finally {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error("API Error: HTTP " + response.status);
      }

      updateLoaderStatus("Job listings process ho rahi hain...");

      const data = await response.json();

      console.log("JOBNEX API Response:", data);

      const jobs = Array.isArray(data)
        ? data
        : Array.isArray(data.jobs)
        ? data.jobs
        : Array.isArray(data.data?.jobs)
        ? data.data.jobs
        : Array.isArray(data.results)
        ? data.results
        : [];

      if (data.success === false) {
        throw new Error(
          data.message || "API request unsuccessful."
        );
      }

      if (data.total !== undefined) {
        const parsedTotal = Number(data.total);

        if (Number.isFinite(parsedTotal)) {
          totalAvailable = parsedTotal;
        }
      }

      const apiHasMore =
        data.hasMore ?? data.data?.hasMore;

      hasMore = typeof apiHasMore === "boolean"
        ? apiHasMore
        : jobs.length >= LIMIT;

      for (const job of jobs) {
        if (!job) continue;

        const id = String(
          job._id ||
          job.id ||
          job.jobId ||
          [
            getTitle(job),
            getCompany(job),
            getLocation(job)
          ].join("-")
        );

        if (seen.has(id)) continue;

        seen.add(id);

        // Koi location ya category filter nahi.
        // Sirf unavailable jobs hide hongi.
        if (isJobAvailable(job)) {
          loadedJobs.push(job);
        }
      }

      totalLoaded += jobs.length;

      page++;

      // Pehle job cards render hongi.
      renderJobs();

      // Initial jobs render hote hi loader hata dein.
      if (!initialLoadFinished) {
        initialLoadFinished = true;
        hideLoader();
      }

      if (hasMore) {
        moreBtn.style.display = "inline-flex";
        moreBtn.textContent = "⬇ More Jobs देखें";

        message.textContent =
          "Abhi " + loadedJobs.length +
          " available jobs load hui hain.";
      } else {
        moreBtn.style.display = "none";

        message.textContent =
          "Sabhi available pages check kar liye gaye hain. Total " +
          loadedJobs.length + " available jobs dikh rahi hain.";
      }

      console.log("API records:", totalLoaded);
      console.log("Available jobs:", loadedJobs.length);
      console.log("More pages available:", hasMore);

    } catch (error) {
      console.error("JOBNEX jobs error:", error);

      const errorText = error.name === "AbortError"
        ? "Server se response aane mein zyada samay lag raha hai."
        : "Jobs load nahi ho sakin. Internet connection ya server check karein.";

      message.textContent = errorText;

      moreBtn.style.display = "inline-flex";
      moreBtn.textContent = "🔄 Dobara try karein";

      if (!initialLoadFinished) {
        showLoaderError(errorText);
      }

    } finally {
      loading = false;
      moreBtn.disabled = false;
    }
  }

  // ==========================================
  // RETRY FROM LOADER
  // ==========================================

  loaderRetry.addEventListener("click", () => {
    if (loading) return;

    // Retry par loader phir se show karein.
    pageLoader.classList.remove("jnx-loader-hide");
    pageLoader.classList.remove("jnx-loader-failed");

    loaderError.textContent = "";
    loaderRetry.style.display = "none";

    updateLoaderStatus("Server se dobara connect ho raha hai...");

    hasMore = true;

    loadJobs();
  });

  // ==========================================
  // MORE JOBS / RETRY
  // ==========================================

  moreBtn.addEventListener("click", () => {
    if (!hasMore && message.textContent.includes("load nahi")) {
      hasMore = true;
    }

    loadJobs();
  });

  // ==========================================
  // INITIAL LOAD
  // ==========================================

  loadJobs();

})();
