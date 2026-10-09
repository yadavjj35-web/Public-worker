<script>
(() => {
  const API_URL =
    "https://industrial-contractor-job-network.onrender.com/api/jobs/public-all";

  const LOCATION_PATTERN = /\brudrapur\b|\bsidcul\b|\bpantnagar\b|\bpant nagar\b/i;
  const LIMIT = 10;

  const grid = document.getElementById("rudrapurJobsGrid");
  const count = document.getElementById("rudrapurJobsCount");
  const moreBtn = document.getElementById("rudrapurMoreJobsBtn");
  const message = document.getElementById("rudrapurJobsMessage");

  if (!grid || !count || !moreBtn || !message) return;

  let page = 1;
  let loading = false;
  let hasMore = true;
  let loadedJobs = [];
  const seenIds = new Set();

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function jobLocation(job) {
    return [
      job.companyLocation,
      job.industrialArea,
      job.location,
      job.city,
      job.contractorId?.industrialArea,
      job.contractorId?.city,
      job.contractorId?.location
    ].filter(Boolean).join(" ");
  }

  function isActive(job) {
    const status = String(job.status || "").toLowerCase();

    if (job.isClosedByAdmin === true || job.isActive === false) {
      return false;
    }

    if (["closed", "inactive", "expired", "filled"].includes(status)) {
      return false;
    }

    if (
      job.workersRemaining !== undefined &&
      job.workersRemaining !== null &&
      Number(job.workersRemaining) <= 0
    ) {
      return false;
    }

    return true;
  }

  function salaryText(job) {
    const min = Number(job.salaryMin);
    const max = Number(job.salaryMax);

    if (min > 0 && max > 0) {
      return `₹${min.toLocaleString("en-IN")} - ₹${max.toLocaleString("en-IN")}`;
    }
    if (min > 0) return `₹${min.toLocaleString("en-IN")}+`;
    if (max > 0) return `Up to ₹${max.toLocaleString("en-IN")}`;

    return "वेतन की जानकारी उपलब्ध नहीं";
  }

  function renderJob(job) {
    const id = String(job._id || "");
    const title = escapeHTML(job.jobTitle || "Job Opportunity");
    const company = escapeHTML(job.companyName || "Company");
    const location = escapeHTML(jobLocation(job) || "Location उपलब्ध नहीं");
    const salary = escapeHTML(salaryText(job));
    const qualification = escapeHTML(job.qualification || "निर्दिष्ट नहीं");
    const trade = escapeHTML(job.trade || "निर्दिष्ट नहीं");
    const gender = escapeHTML(job.gender || "Any");

    const minExp = job.experienceMin;
    const maxExp = job.experienceMax;

    let experience = "कोई भी / जानकारी उपलब्ध नहीं";
    if (minExp != null && maxExp != null) {
      experience = `${minExp} - ${maxExp} वर्ष`;
    } else if (minExp != null) {
      experience = `${minExp}+ वर्ष`;
    } else if (maxExp != null) {
      experience = `अधिकतम ${maxExp} वर्ष`;
    }

    const remaining = job.workersRemaining;
    const vacancy = remaining != null
      ? `${escapeHTML(remaining)} Vacancy`
      : "Available";

    return `
      <article class="job-card">
        <div class="job-top">
          <div>
            <h3 class="job-title">${title}</h3>
            <div class="company-name">🏭 ${company}</div>
          </div>
          <span class="job-badge">${vacancy}</span>
        </div>

        <div class="job-details">
          <div class="detail">📍 <strong>स्थान:</strong> ${location}</div>
          <div class="detail">💰 <strong>वेतन:</strong> ${salary}</div>
          <div class="detail">🎓 <strong>योग्यता:</strong> ${qualification}</div>
          <div class="detail">🔧 <strong>Trade:</strong> ${trade}</div>
          <div class="detail">🧑‍🔧 <strong>अनुभव:</strong> ${escapeHTML(experience)}</div>
          <div class="detail">👤 <strong>Gender:</strong> ${gender}</div>
        </div>

        <div class="job-actions">
          <a class="view-details-btn"
             href="/job.html?id=${encodeURIComponent(id)}">
            👁️ View Details
          </a>
        </div>
      </article>
    `;
  }

  function renderJobs() {
    if (!loadedJobs.length) {
      grid.innerHTML = `
        <div class="message-box" style="grid-column:1/-1">
          अभी Rudrapur या आसपास की कोई Active Job नहीं मिली।
        </div>`;
      count.textContent = "0 Jobs";
      return;
    }

    grid.innerHTML = loadedJobs.map(renderJob).join("");
    count.textContent = `${loadedJobs.length} Jobs`;

    if (!hasMore) {
      moreBtn.style.display = "none";
      message.textContent = "सभी उपलब्ध pages चेक कर लिए गए हैं।";
    }
  }

  async function loadJobs() {
    if (loading || !hasMore) return;

    loading = true;
    moreBtn.disabled = true;
    moreBtn.textContent = "⏳ Jobs लोड हो रही हैं...";

    try {
      const url = `${API_URL}?page=${page}&limit=${LIMIT}`;
      const response = await fetch(url, {
        headers: { Accept: "application/json" }
      });

      if (!response.ok) {
        throw new Error(`API Error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.jobs)) {
        throw new Error("API response में jobs array नहीं मिला।");
      }

      // API की मौजूदा location fields के आधार पर filter करें।
      for (const job of data.jobs) {
        if (!job || !job._id) continue;

        const id = String(job._id);
        if (seenIds.has(id)) continue;
        seenIds.add(id);

        if (!isActive(job)) continue;

        if (LOCATION_PATTERN.test(jobLocation(job))) {
          loadedJobs.push(job);
        }
      }

      hasMore = data.hasMore === true;
      page++;

      renderJobs();

      if (hasMore) {
        moreBtn.style.display = "inline-block";
        moreBtn.textContent = "⬇️ More Jobs देखें";
        message.textContent =
          "और नौकरियाँ देखने के लिए More Jobs बटन दबाएँ।";
      } else {
        moreBtn.style.display = "none";
      }

    } catch (error) {
      console.error("Rudrapur Jobs API Error:", error);

      message.textContent =
        "Jobs लोड नहीं हो सकीं। कुछ देर बाद दोबारा कोशिश करें।";

      moreBtn.style.display = "inline-block";
      moreBtn.textContent = "🔄 दोबारा कोशिश करें";
    } finally {
      loading = false;
      moreBtn.disabled = false;
    }
  }

  moreBtn.addEventListener("click", loadJobs);
  loadJobs();
})();
</script>
