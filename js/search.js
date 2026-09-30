let selectedJob = null;


const searchForm =
  document.getElementById(
    "searchForm"
  );


const jobsBox =
  document.getElementById(
    "jobs"
  );


const messageBox =
  document.getElementById(
    "message"
  );


const modal =
  document.getElementById(
    "applyModal"
  );


searchForm.addEventListener(
  "submit",
  async event => {

    event.preventDefault();

    await searchJobs();

  }
);


/* =========================================================
   SEARCH JOBS
========================================================= */

async function searchJobs() {

  messageBox.innerHTML =
    "Searching jobs...";

  jobsBox.innerHTML =
    "";


  const params =
    new URLSearchParams();


  const fields = {

    qualification:
      document.getElementById(
        "qualification"
      ).value,

    trade:
      document.getElementById(
        "trade"
      ).value,

    location:
      document.getElementById(
        "location"
      ).value,

    experience:
      document.getElementById(
        "experience"
      ).value,

    preferredJob:
      document.getElementById(
        "preferredJob"
      ).value,

    skills:
      document.getElementById(
        "skills"
      ).value,

    gender:
      document.getElementById(
        "gender"
      ).value

  };


  Object.entries(fields)
    .forEach(
      ([key, value]) => {

        if (
          value !== undefined &&
          value !== null &&
          String(value).trim()
        ) {

          params.set(
            key,
            value
          );

        }

      }
    );


  try {

    const response =
      await fetch(
        `${API_URL}/public-worker/jobs/search?${params.toString()}`
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Search failed"
      );

    }


    messageBox.innerHTML =
      `${data.count || 0} jobs found`;


    if (
      !data.jobs ||
      !data.jobs.length
    ) {

      jobsBox.innerHTML = `

        <div class="empty">

          <h3>
            No jobs found
          </h3>

          <p>
            Search details change karke dobara try karein.
          </p>

        </div>

      `;

      return;

    }


    jobsBox.innerHTML =
      data.jobs
        .map(renderJob)
        .join("");


  }

  catch (error) {

    console.error(error);

    messageBox.innerHTML =
      `<div class="error">
        ${escapeHtml(
          error.message
        )}
      </div>`;

  }

}


/* =========================================================
   JOB CARD
========================================================= */

function renderJob(job) {

  const salary =
    job.salaryMin ||
    job.salaryMax
      ? `₹${job.salaryMin || 0} - ₹${job.salaryMax || 0}`
      : "Salary not specified";


  return `

    <div class="job-card">

      <div class="job-top">

        <h3>
          ${escapeHtml(
            job.jobTitle || "Job"
          )}
        </h3>

        <span class="badge">
          ${escapeHtml(
            job.status || "Open"
          )}
        </span>

      </div>


      <p class="company">
        ${escapeHtml(
          job.companyName || ""
        )}
      </p>


      <p>
        📍
        ${escapeHtml(
          job.companyLocation || ""
        )}
      </p>


      <div class="details">

        <span>
          🎓
          ${escapeHtml(
            job.qualification || "-"
          )}
        </span>

        <span>
          🔧
          ${escapeHtml(
            job.trade || "-"
          )}
        </span>

        <span>
          💼
          ${job.experienceMin || 0}
          -
          ${job.experienceMax ?? "-"}
          Years
        </span>

        <span>
          💰
          ${salary}
        </span>

      </div>


      <p>
        Workers:
        ${
          job.workersRemaining === null
            ? "Open"
            : job.workersRemaining
        }
        remaining
      </p>


      ${
        job.skills &&
        job.skills.length
          ? `
            <p class="skills">
              ${job.skills
                .map(
                  x =>
                    `<span>${escapeHtml(x)}</span>`
                )
                .join("")}
            </p>
          `
          : ""
      }


      <button
        class="primary"
        onclick='openApply(${JSON.stringify(
          job
        )})'
      >
        Refer / Apply
      </button>


    </div>

  `;

}


/* =========================================================
   OPEN APPLY
========================================================= */

function openApply(job) {

  selectedJob =
    job;


  document.getElementById(
    "selectedJob"
  ).innerHTML = `

    <strong>
      ${escapeHtml(
        job.jobTitle
      )}
    </strong>

    <br>

    ${escapeHtml(
      job.companyName || ""
    )}

    <br>

    📍
    ${escapeHtml(
      job.companyLocation || ""
    )}

  `;


  modal.classList.remove(
    "hidden"
  );

}


/* =========================================================
   CLOSE
========================================================= */

function closeApply() {

  modal.classList.add(
    "hidden"
  );

}


/* =========================================================
   APPLY
========================================================= */

document
  .getElementById(
    "applyForm"
  )
  .addEventListener(
    "submit",
    async event => {

      event.preventDefault();


      const applyMessage =
        document.getElementById(
          "applyMessage"
        );


      const workerMobile =
        document.getElementById(
          "workerMobile"
        )
        .value
        .replace(
          /\D/g,
          ""
        )
        .slice(-10);


      if (
        !/^\d{10}$/.test(
          workerMobile
        )
      ) {

        applyMessage.innerHTML =
          `<div class="error">
            Please enter valid 10 digit mobile number.
          </div>`;

        return;

      }


      const body = {

        jobId:
          selectedJob._id,

        workerName:
          document.getElementById(
            "workerName"
          ).value,

        workerMobile,

        qualification:
          document.getElementById(
            "workerQualification"
          ).value,

        trade:
          document.getElementById(
            "workerTrade"
          ).value,

        experience:
          document.getElementById(
            "workerExperience"
          ).value,

        skills:
          document.getElementById(
            "workerSkills"
          ).value,

        preferredLocation:
          document.getElementById(
            "workerLocation"
          ).value

      };


      applyMessage.innerHTML =
        "Submitting...";


      try {

        const response =
          await fetch(
            `${API_URL}/public-worker/apply`,
            {

              method:
                "POST",

              headers: {

                "Content-Type":
                  "application/json"

              },

              body:
                JSON.stringify(body)

            }
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data.message ||
            "Application failed"
          );

        }


        /*
         * Worker ko ID nahi dikhayenge.
         * Token browser mein save rahega.
         */

        localStorage.setItem(
          "publicWorkerTrackingToken",
          data.trackingToken
        );


        applyMessage.innerHTML = `

          <div class="success">

            <h3>
              Application Submitted
            </h3>

            <p>
              Aapki application admin verification
              ke liye bhej di gayi hai.
            </p>

            <button
              class="primary"
              onclick="goToStatus()"
            >
              My Status
            </button>

          </div>

        `;


        document
          .getElementById(
            "applyForm"
          )
          .reset();


      }

      catch (error) {

        applyMessage.innerHTML =
          `<div class="error">
            ${escapeHtml(
              error.message
            )}
          </div>`;

      }

    }
  );


function goToStatus() {

  window.location.href =
    "status.html";

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHtml(value) {

  return String(
    value ?? ""
  )
    .replace(
      /&/g,
      "&amp;"
    )
    .replace(
      /</g,
      "&lt;"
    )
    .replace(
      />/g,
      "&gt;"
    )
    .replace(
      /"/g,
      "&quot;"
    )
    .replace(
      /'/g,
      "&#039;"
    );

        }
