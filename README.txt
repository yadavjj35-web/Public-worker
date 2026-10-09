JOBNEX — Updated 30 SEO HTML Pages + Live Job Listings
=====================================================

Files included:
- 30 updated SEO HTML pages
- jobnex-seo.css: shared responsive dark theme for all pages
- jobnex-seo-jobs.js: shared API loader, active-job filtering, job cards and More Jobs button
- keyword-file-map.csv: original keyword/page mapping

How to deploy:
1. Upload all 30 HTML files plus jobnex-seo.css and jobnex-seo-jobs.js into the same public/root folder on rudrapurjob.online.
2. Keep the existing job.html page in the same folder, because job cards link to job.html?id=JOB_ID.
3. The loader requests https://industrial-contractor-job-network.onrender.com/api/jobs/public-all?page=N&limit=50.
4. If listings do not load in the browser, check that the API is online, returns JSON with a jobs array (or data.jobs), allows CORS from rudrapurjob.online, and uses the expected field names. Browser console will show the failure.
5. Live data is filtered for active status and page location/category. If your API uses different fields for city, salary, job ID, or status, adjust the shared jobnex-seo-jobs.js once; all pages use it.

Notes:
- Job detail links assume job.html?id=<id>. Change href in jobnex-seo-jobs.js if your detail route differs.
- These pages use the existing domain canonical URLs. Confirm your final production URL structure before deployment.
- SEO ranking is not guaranteed. Keep pages useful, check active listing accuracy, and include published pages in your XML sitemap.
