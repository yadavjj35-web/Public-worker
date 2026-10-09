module.exports = async (req, res) => {
const SITE_URL = "https://rudrapurjob.online";
const API_URL = "https://industrial-contractor-job-network.onrender.com/api";

try {
    const allJobs = [];
    let page = 1;
    const limit = 100;
    let totalPages = 1;

    // Backend se sabhi jobs page-by-page fetch karein
    do {
        const response = await fetch(
            `${API_URL}/jobs/public-all?page=${page}&limit=${limit}`
        );

        if (!response.ok) {
            throw new Error(`Jobs API failed: ${response.status}`);
        }

        const data = await response.json();

        if (!data.success || !Array.isArray(data.jobs)) {
            throw new Error("Invalid Jobs API response");
        }

        allJobs.push(...data.jobs);

        const total = Number(data.total || 0);
        totalPages = Math.max(1, Math.ceil(total / limit));

        if (data.hasMore === false) {
            break;
        }

        page++;
    } while (page <= totalPages);

    // Sirf valid aur active jobs Sitemap mein rakhein
    const activeJobs = allJobs.filter(job => {
        if (!job || !job._id) return false;

        const status = String(job.status || "").toLowerCase();

        if (
            job.isClosedByAdmin === true ||
            job.isActive === false ||
            ["closed", "inactive", "expired"].includes(status)
        ) {
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
    });

    // Duplicate jobs hata dein
    const uniqueJobs = [
        ...new Map(
            activeJobs.map(job => [String(job._id), job])
        ).values()
    ];

    // Homepage aur active job detail pages
    const urls = [
        `${SITE_URL}/`,
        ...uniqueJobs.map(
            job => `${SITE_URL}/job.html?id=${encodeURIComponent(job._id)}`
        )
    ];

    const escapeXml = value =>
        String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&apos;");

    const xmlUrls = urls.map(url => `
<url>
    <loc>${escapeXml(url)}</loc>
</url>`).join("");

    const xml = `<?xml version="1.0" encoding="UTF-8"?>

<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${xmlUrls}
</urlset>`;    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader(
        "Cache-Control",
        "public, s-maxage=300, stale-while-revalidate=600"
    );

    return res.status(200).send(xml);

} catch (error) {
    console.error("JOBNEX SITEMAP ERROR:", error);

    return res.status(500).send(
        "Sitemap generate nahi ho saka. Jobs API check karein."
    );
}

};
