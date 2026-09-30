const statusArea =
  document.getElementById(
    "statusArea"
  );


async function loadStatus() {

  const token =
    localStorage.getItem(
      "publicWorkerTrackingToken"
    );


  if (!token) {

    statusArea.innerHTML = `

      <div class="empty">

        <h3>
          No application found
        </h3>

        <p>
          Pehle kisi job ke liye application submit karein.
        </p>

        <a
          href="index.html"
          class="primary button-link"
        >
          Find Jobs
        </a>

      </div>

    `;

    return;

  }


  try {

    const response =
      await fetch(
        `${API_URL}/public-worker/status/${token}`
      );


    const data =
      await response.json();


    if (!response.ok) {

      throw new Error(
        data.message ||
        "Unable to load status"
      );

    }


    renderStatus(
      data
    );


  }

  catch (error) {

    statusArea.innerHTML = `

      <div class="error">

        ${escapeHtml(
          error.message
        )}

      </div>

    `;

  }

}


/* =========================================================
   RENDER STATUS
========================================================= */

function renderStatus(data) {

  const status =
    data.status ||
    "Pending";


  let contractorHtml =
    "";


  /*
   * Contractor details ONLY after Accepted
   */

  if (
    status ===
    "Accepted" &&
    data.contractor
  ) {

    contractorHtml = `

      <div class="contractor-box">

        <h3>
          Contractor Details
        </h3>

        <p>
          <strong>
            Name:
          </strong>

          ${escapeHtml(
            data.contractor.contractorName
          )}

        </p>


        <p>

          <strong>
            Mobile:
          </strong>

          <a
            href="tel:${escapeHtml(
              data.contractor.mobile
            )}"
          >
            ${escapeHtml(
              data.contractor.mobile
            )}
          </a>

        </p>

      </div>

    `;

  }


  statusArea.innerHTML = `

    <div class="worker-info">

      <h3>
        ${escapeHtml(
          data.workerName
        )}
      </h3>

      <p>
        Mobile:
        ${escapeHtml(
          data.workerMobile
        )}
      </p>

    </div>


    <div class="job-info">

      <h3>
        ${escapeHtml(
          data.job?.jobTitle || ""
        )}
      </h3>

      <p>
        ${escapeHtml(
          data.job?.companyName || ""
        )}
      </p>

      <p>
        📍
        ${escapeHtml(
          data.job?.companyLocation || ""
        )}
      </p>

    </div>


    <div class="status-flow">

      ${statusStep(
        "Pending",
        status,
        [
          "Pending",
          "Processing",
          "Accepted"
        ]
      )}

      <div class="arrow">
        ↓
      </div>

      ${statusStep(
        "Processing",
        status,
        [
          "Processing",
          "Accepted"
        ]
      )}

      <div class="arrow">
        ↓
      </div>

      ${statusStep(
        "Accepted",
        status,
        [
          "Accepted"
        ]
      )}

    </div>


    ${
      status === "Rejected"
        ? `
          <div class="error">

            Your application was rejected.

          </div>
        `
        : ""
    }


    ${contractorHtml}

  `;

}


function statusStep(
  title,
  current,
  activeStatuses
) {

  const active =
    activeStatuses.includes(
      current
    );


  return `

    <div
      class="status-step ${
        active
          ? "active"
          : ""
      }"
    >

      <span>
        ${
          active
            ? "✓"
            : "○"
        }
      </span>

      <strong>
        ${title}
      </strong>

    </div>

  `;

}


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


loadStatus();


/*
 * Status automatically refresh
 */

setInterval(
  loadStatus,
  30000
);
