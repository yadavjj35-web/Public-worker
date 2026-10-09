const API_URL =
  "https://industrial-contractor-job-network.onrender.com/api/jobs/public-all";

const SITE_URL = "https://rudrapurjob.online";

module.exports = async (req, res) => {
  try {
    const urls = [];
    const seenUrls = new Set();

    // Add URL without creating duplicates.
    const addUrl = (loc, lastmod = null) => {
      if (seenUrls.has(loc)) return;

      seenUrls.add(loc);
      urls.push({ loc, lastmod });
    };

    const now = new Date().toISOString();

    // ==========================================
    // 1. HOMEPAGE
    // ==========================================

    addUrl(`${SITE_URL}/`, now);

    // ==========================================
    // 2. EXISTING JOB DETAILS PAGE
    // ==========================================

    addUrl(`${SITE_URL}/job.html`, now);

    // ==========================================
    // 3. ALL 30 SEO LANDING PAGES
    // ==========================================

    const seoPages = [
      "rudrapur-jobs.html",
      "rudrapur-sidcul-jobs.html",
      "pantnagar-jobs.html",
      "uttarakhand-jobs.html",
      "sidcul-vacancy.html",
      "rudrapur-vacancy.html",
      "pantnagar-vacancy.html",
      "rudrapur-private-jobs.html",
      "pantnagar-company-jobs.html",
      "uttarakhand-private-jobs.html",
      "rudrapur-iti-jobs.html",
      "pantnagar-iti-jobs.html",
      "rudrapur-diploma-jobs.html",
      "pantnagar-diploma-jobs.html",
      "rudrapur-helper-vacancy.html",
      "pantnagar-helper-jobs.html",
      "rudrapur-electrician-jobs.html",
      "pantnagar-electrician-jobs.html",
      "rudrapur-technician-jobs.html",
      "pantnagar-technician-jobs.html",
      "rudrapur-production-jobs.html",
      "sidcul-company-jobs.html",
      "rudrapur-fresher-jobs.html",
      "pantnagar-fresher-jobs.html",
      "rudrapur-maintenance-jobs.html",
      "pantnagar-maintenance-jobs.html",
      "rudrapur-supervisor-jobs.html",
      "uttarakhand-iti-jobs.html",
      "uttarakhand-diploma-jobs.html",
      "rudrapur-factory-jobs.html"
    ];

    for (const page of seoPages) {
      addUrl(`${SITE_URL}/${page}`, now);
    }

    // ==========================================
    // 4. FETCH JOBS FROM PUBLIC JOBS API
    // ==========================================

    let page = 1;
    const limit = 100;
    let hasMore = true;
    const seenIds = new Set();

    while (hasMore && page <= 100) {
      const response = await fetch(
        `${API_URL}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(
          `Jobs API returned status ${response.status}`
        );
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.jobs)) {
        throw new Error("Invalid Jobs API response");
      }

      for (const job of data.jobs) {
        if (!job._id || seenIds.has(String(job._id))) {
          continue;
        }

        seenIds.add(String(job._id));

        // Only include active and partially filled jobs.
        if (
          job.isClosedByAdmin === true ||
          !["Active", "Partially Filled"].includes(job.status)
        ) {
          continue;
        }

        // Exclude jobs whose application deadline has passed.
        if (job.lastDate) {
          const deadline = new Date(job.lastDate);

          if (
            !Number.isNaN(deadline.getTime()) &&
            deadline.getTime() < Date.now()
          ) {
            continue;
          }
        }

        // Add individual job details URL.
        const jobUrl =
          `${SITE_URL}/job.html?id=${encodeURIComponent(
            String(job._id)
          )}`;

        const lastmod = job.updatedAt || job.createdAt || null;

        addUrl(jobUrl, lastmod);
      }

      hasMore = data.hasMore === true;
      page++;
    }

    // ==========================================
    // 5. XML ESCAPING
    // ==========================================

    const escapeXml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    // ==========================================
    // 6. GENERATE XML SITEMAP
    // ==========================================

    const xmlUrls = urls
      .map((item) => {
        let lastmodTag = "";

        if (item.lastmod) {
          const date = new Date(item.lastmod);

          if (!Number.isNaN(date.getTime())) {
            lastmodTag =
              `\n    <lastmod>${date.toISOString()}</lastmod>`;
          }
        }

        return `  <url>
    <loc>${escapeXml(item.loc)}</loc>${lastmodTag}
  </url>`;
      })
      .join("\n");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

    // ==========================================
    // 7. RESPONSE HEADERS
    // ==========================================

    res.setHeader(
      "Content-Type",
      "application/xml; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300"
    );

    return res.status(200).send(xml);

  } catch (error) {
    console.error("JOBNEX sitemap error:", error);

    res.setHeader(
      "Content-Type",
      "text/plain; charset=utf-8"
    );

    return res.status(500).send(
      "Unable to generate sitemap"
    );
  }
};
