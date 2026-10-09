
(() => {
  "use strict";

  // ==========================================
  // JOBNEX - ALL JOBS LISTING
  // No location/category restrictions
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
        "cancelled"
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

    const hasMin = min !== null && min !== undefined;
    const hasMax = max !== null && max !== undefined;

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
  // LOAD ALL AVAILABLE PAGES
  // ==========================================

  async function loadJobs() {
    if (loading || !hasMore) return;

    loading = true;

    moreBtn.disabled = true;
    moreBtn.textContent = "⏳ Jobs लोड हो रही हैं...";
    message.textContent = "";

    try {
      const url =
        API_URL +
        "?page=" + page +
        "&limit=" + LIMIT;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Accept: "application/json"
        }
      });

      if (!response.ok) {
        throw new Error(
          "API Error: HTTP " + response.status
        );
      }

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
        totalAvailable = Number(data.total);
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
        // Sirf closed/expired/filled jobs hide hongi.
        if (isJobAvailable(job)) {
          loadedJobs.push(job);
        }
      }

      totalLoaded += jobs.length;

      page++;

      renderJobs();

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

      message.textContent =
        "Jobs load nahi ho sakin: " +
        (error.message || "Network ya API error.");

      moreBtn.style.display = "inline-flex";
      moreBtn.textContent = "🔄 Dobara try karein";

    } finally {
      loading = false;
      moreBtn.disabled = false;
    }
  }

  // ==========================================
  // MORE JOBS / RETRY
  // ==========================================

  moreBtn.addEventListener("click", () => {
    if (!hasMore && message.textContent.includes("load nahi")) {
      hasMore = true;
    }

    loadJobs();
  });

  // Initial load
  loadJobs();

})();

