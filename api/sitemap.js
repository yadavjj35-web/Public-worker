const API_URL =
  "https://industrial-contractor-job-network.onrender.com/api/jobs/public-all";

const SITE_URL = "https://rudrapurjob.online";

module.exports = async (req, res) => {
  try {
    const urls = [
      {
        loc: `${SITE_URL}/`,
        lastmod: new Date().toISOString()
      },
      {
        loc: `${SITE_URL}/job.html`
      }
    ];

    let page = 1;
    const limit = 100;
    let hasMore = true;
    const seenIds = new Set();

    while (hasMore && page <= 100) {
      const response = await fetch(
        `${API_URL}?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error(`Jobs API returned ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.jobs)) {
        throw new Error("Invalid Jobs API response");
      }

      for (const job of data.jobs) {
        if (!job._id || seenIds.has(job._id)) continue;

        seenIds.add(job._id);

        // Only include open jobs.
        if (
          job.isClosedByAdmin === true ||
          !["Active", "Partially Filled"].includes(job.status)
        ) {
          continue;
        }

        // Exclude jobs whose application deadline has passed.
        if (
          job.lastDate &&
          !Number.isNaN(Date.parse(job.lastDate)) &&
          new Date(job.lastDate) < new Date()
        ) {
          continue;
        }

        urls.push({
          loc: `${SITE_URL}/job.html?id=${encodeURIComponent(job._id)}`,
          lastmod: job.updatedAt || job.createdAt
        });
      }

      hasMore = data.hasMore === true;
      page++;
    }

    const escapeXml = (value) =>
      String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");

    const xmlUrls = urls
      .map((item) => {
        const lastmod = item.lastmod
          ? `<lastmod>${escapeXml(
              new Date(item.lastmod).toISOString()
            )}</lastmod>`
          : "";

        return `
  <url>
    <loc>${escapeXml(item.loc)}</loc>
    ${lastmod}
  </url>`;
      })
      .join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Cache-Control", "public, s-maxage=300");
    return res.status(200).send(xml);
  } catch (error) {
    console.error("JOBNEX sitemap error:", error);

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return res.status(500).send("Unable to generate sitemap");
  }
};
