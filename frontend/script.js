// Hirebase Frontend JavaScript

const JAVA_API = "http://localhost:4567";
const ML_API = "http://localhost:5000";

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function getSignedInJobSeekerId() {
  const role = localStorage.getItem("userType");
  if (role && role !== "job_seeker") return null;
  return localStorage.getItem("jobSeekerId") || (role === "job_seeker" ? localStorage.getItem("userId") : null);
}

function initializeAccountIdentity() {
  const identityCard = document.getElementById("accountIdentityCard");
  const dashboardIdentity = document.getElementById("dashboardAccountIdentity");
  const appHeader = document.querySelector(".app-header");
  if (!identityCard && !dashboardIdentity && !appHeader) return;
  const appNav = appHeader?.querySelector(".app-nav");
  let sessionChip = document.getElementById("appSessionIdentity");
  if (appHeader && !sessionChip) {
    sessionChip = document.createElement("span");
    sessionChip.id = "appSessionIdentity";
    sessionChip.className = "app-session-chip";
    sessionChip.hidden = true;
    const navigation = appHeader.querySelector(".app-nav");
    if (navigation) appHeader.insertBefore(sessionChip, navigation);
  }

  const accountId = localStorage.getItem("userId")
    || localStorage.getItem("jobSeekerId")
    || localStorage.getItem("employerId");
  const userType = localStorage.getItem("userType")
    || (localStorage.getItem("jobSeekerId") ? "job_seeker" : null)
    || (localStorage.getItem("employerId") ? "employer" : null);
  const roleName = userType === "job_seeker" ? "Job Seeker" : userType === "employer" ? "Employer" : "Account";
  const keys = ["userId", "userName", "userEmail", "userType", "jobSeekerId", "employerId"];

  function renderAppNavigation(role) {
    if (!appNav) return;
    const page = window.location.pathname.split("/").pop();
    const items = role === "job_seeker"
      ? [["Dashboard", "job-seeker-dashboard.html"], ["Find Jobs", "search-jobs.html"], ["Saved Jobs", "saved-jobs.html"], ["My Profile", "profile.html?v=20261025-quality-pass"]]
      : role === "employer"
        ? [["Dashboard", "employer-dashboard.html"], ["Post a Job", "post-job.html"], ["Company Profile", "employer-profile.html?v=20261025-quality-pass"]]
        : [["Home", "../index.html"], ["Find Jobs", "search-jobs.html"], ["Login", "login.html"], ["Create Account", "register.html"]];
    const activePage = page === "job-details.html" ? "search-jobs.html" : page;
    appNav.innerHTML = items.map(([label, href]) =>
      `<a href="${href}"${href.split("?")[0] === activePage ? ' class="active" aria-current="page"' : ""}>${label}</a>`
    ).join("");
    if (role) {
      const logout = document.createElement("a");
      logout.href = "login.html";
      logout.textContent = "Logout";
      logout.addEventListener("click", (event) => {
        event.preventDefault();
        keys.forEach((key) => localStorage.removeItem(key));
        window.location.href = "login.html";
      });
      appNav.appendChild(logout);
    }
  }

  function renderIdentity({ name = "", email = "", id = "", role = roleName, status = "Active account" } = {}) {
    const verified = Boolean(id) && status !== "Signed out" && status !== "Account no longer exists";
    renderAppNavigation(verified ? userType : null);
    if (sessionChip) {
      sessionChip.hidden = !verified;
      sessionChip.textContent = verified ? `${role} · ${email || name || "Account"} · ID ${id}` : "";
      sessionChip.title = verified ? `${role} account · ${email || name || ""} · ID ${id}` : "";
    }
    if (identityCard) {
      const avatar = document.getElementById("accountAvatar");
      const nameNode = document.getElementById("accountDisplayName");
      const emailNode = document.getElementById("accountDisplayEmail");
      const roleNode = document.getElementById("accountRoleLabel");
      const idNode = document.getElementById("accountIdValue");
      const statusNode = document.getElementById("accountIdentityStatus");
      const loginLink = document.getElementById("accountIdentityLogin");
      if (avatar) avatar.textContent = (name || "?").trim().charAt(0).toUpperCase() || "?";
      if (nameNode) nameNode.textContent = name || "No signed-in account";
      if (emailNode) emailNode.textContent = email || (id
        ? "Sign out and sign in again to refresh the account email"
        : "Sign in to view account details");
      if (roleNode) roleNode.textContent = role;
      if (idNode) idNode.textContent = verified ? id : "—";
      if (statusNode) statusNode.textContent = status;
      if (loginLink) loginLink.hidden = verified;
    }
    if (dashboardIdentity) {
      dashboardIdentity.textContent = verified
        ? `${role} · ${email || name || "Account"} · ID ${id}`
        : status === "Signed out" ? "No account is signed in" : "Checking account status…";
    }
  }

  if (!accountId || !["job_seeker", "employer"].includes(userType)) {
    renderIdentity({ status: "Signed out", role: "No active account" });
    return;
  }

  // Use the successful login saved in this browser immediately. The API check
  // below can invalidate it, but an older running backend must not hide the session.
  renderIdentity({
    name: localStorage.getItem("userName") || "",
    email: localStorage.getItem("userEmail") || "",
    id: accountId,
    status: "Active account"
  });

  fetch(`${JAVA_API}/account-exists/${encodeURIComponent(userType)}/${encodeURIComponent(accountId)}`)
    .then((response) => response.ok ? response.json() : null)
    .then((result) => {
      if (!result) {
        // Keep the signed-in UI. The protected API action will show a useful
        // backend error if the account is actually unavailable.
        return;
      }
      if (result?.success && result.exists) {
        const name = result.userName || localStorage.getItem("userName") || "";
        const email = result.email || localStorage.getItem("userEmail") || "";
        localStorage.setItem("userName", name);
        localStorage.setItem("userEmail", email);
        renderIdentity({ name, email, id: accountId, status: "Active account" });
      } else if (result?.success && !result.exists) {
        keys.forEach((key) => localStorage.removeItem(key));
        renderIdentity({ status: "Account no longer exists", role: "Signed out" });
      }
    })
    .catch(() => { /* Keep the locally established login state. */ });
}

initializeAccountIdentity();

// ==================== POST JOB BUTTON ====================

const postJobBtn = document.getElementById("postJobBtn");

if (postJobBtn) {
  postJobBtn.onclick = function () {
    window.location.href = "post-job.html";
  };
}


// ==================== REGISTRATION ====================

const registerForm = document.getElementById("registerForm");

if (registerForm) {

  registerForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const formData = new FormData(this);
    const userData = {};

    for (let [key, value] of formData.entries()) {
      userData[key] = value;
    }

    const selectedUserType = document.querySelector(
      'input[name="userType"]:checked'
    );

    if (!selectedUserType) {

      document.getElementById("message").innerHTML =
        '<p class="error">Please select Job Seeker or Employer.</p>';

      return;
    }

    const userType = selectedUserType.value;

    userData.userType = userType;


    if (userType === "employer") {

      const companyName =
        document.getElementById("companyName");

      const website =
        document.getElementById("website");

      if (companyName) {
        userData.companyName = companyName.value;
      }

      if (website) {
        userData.website = website.value;
      }
    }


    const registerUrl =
      userType === "job_seeker"
        ? `${JAVA_API}/register-job-seeker`
        : `${JAVA_API}/register-employer`;


    try {

      const response = await fetch(registerUrl, {

        method: "POST",

        headers: {
          "Content-Type": "application/json"
        },

        body: JSON.stringify(userData)

      });


      const result = await response.json();

      const messageDiv =
        document.getElementById("message");


      if (result.success) {

        messageDiv.innerHTML =
          `<p class="success">${escapeHtml(result.message)}</p>`;

        this.reset();

      } else {

        messageDiv.innerHTML =
          `<p class="error">${escapeHtml(result.message)}</p>`;
      }


    } catch (error) {

      console.error(
        "Registration error:",
        error
      );

      document.getElementById("message").innerHTML =
        '<p class="error">Error during registration. Please try again.</p>';
    }

  });

}


// ==================== LOGIN ====================

const loginForm =
  document.getElementById("loginForm");

if (loginForm) {

  loginForm.addEventListener("submit", async function (e) {

    e.preventDefault();

    const formData =
      new FormData(this);

    const userData = {};

    for (let [key, value] of formData.entries()) {
      userData[key] = value;
    }


    try {

      const response =
        await fetch(`${JAVA_API}/login`, {

          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify(userData)

        });


      const result =
        await response.json();


      const messageDiv =
        document.getElementById("message");
      const userType = result.userType;


      if (result.success) {

        messageDiv.innerHTML =
          `<p class="success">${escapeHtml(result.message)}</p>`;


        localStorage.setItem(
          "userId",
          result.userId
        );


        localStorage.setItem(
          "userName",
          result.userName || ""
        );

        localStorage.setItem("userEmail", result.email || userData.email || "");


        localStorage.setItem(
          "userType",
          result.userType || userType
        );


        if (userType === "job_seeker") {

          localStorage.setItem(
            "jobSeekerId",
            result.userId
          );

          localStorage.removeItem(
            "employerId"
          );


          alert(
            `Welcome ${result.userName || ""}! You are now logged in.`
          );


          window.location.href =
            "job-seeker-dashboard.html";


        } else {

          localStorage.setItem(
            "employerId",
            result.userId
          );

          localStorage.removeItem(
            "jobSeekerId"
          );


          alert(
            `Welcome ${result.userName || ""}! You are now logged in.`
          );


          window.location.href =
            "employer-dashboard.html";
        }


      } else {

        messageDiv.innerHTML =
          `<p class="error">${escapeHtml(result.message)}</p>`;
      }


    } catch (error) {

      console.error(
        "Login error:",
        error
      );


      document.getElementById("message").innerHTML =
        '<p class="error">Unable to connect to the server. Make sure the Java backend is running.</p>';
    }

  });

}


// ==================== EMPLOYER REGISTRATION FIELDS ====================

const userTypeRadios =
  document.querySelectorAll(
    'input[name="userType"]'
  );


userTypeRadios.forEach((radio) => {

  radio.addEventListener("change", function () {

    const companyNameGroup =
      document.getElementById(
        "companyNameGroup"
      );


    const websiteGroup =
      document.getElementById(
        "websiteGroup"
      );


    if (companyNameGroup) {

      companyNameGroup.style.display =
        this.value === "employer"
          ? "block"
          : "none";
    }


    if (websiteGroup) {

      websiteGroup.style.display =
        this.value === "employer"
          ? "block"
          : "none";
    }

  });

});


// ==================== JOB SEEKER PROFILE ====================

const profileForm =
  document.getElementById("profileForm");


if (profileForm) {

  const jobSeekerId =
    localStorage.getItem("jobSeekerId");


  const jobSeekerIdInput =
    document.getElementById("jobSeekerId");


  if (jobSeekerIdInput) {

    jobSeekerIdInput.value =
      jobSeekerId || "";
  }

  if (jobSeekerId) {
    fetch(`${JAVA_API}/profile-job-seeker/${encodeURIComponent(jobSeekerId)}`)
      .then((response) => response.json())
      .then((result) => {
        if (result.success) {
          document.getElementById("education").value = result.education || "";
          document.getElementById("experience").value = result.experience || "";
          document.getElementById("skills").value = result.skills || "";
        }
      })
      .catch((error) => console.error("Profile loading error:", error));
  }


  profileForm.addEventListener(
    "submit",
    async function (e) {

      e.preventDefault();


      if (!jobSeekerId) {

        document.getElementById("message").innerHTML =
          '<p class="error">Please login as a Job Seeker first.</p>';

        return;
      }


      const profileData = {

        jobSeekerId: jobSeekerId,

        education:
          document.getElementById(
            "education"
          ).value,

        experience:
          document.getElementById(
            "experience"
          ).value,

        skills:
          document.getElementById(
            "skills"
          ).value

      };


      try {

        const response =
          await fetch(
            `${JAVA_API}/profile-job-seeker`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(profileData)

            }
          );


        const result =
          await response.json();


        const messageDiv =
          document.getElementById("message");


        if (result.success) {

          messageDiv.innerHTML =
            `<p class="success">${escapeHtml(result.message)}</p>`;

        } else {

          messageDiv.innerHTML =
            `<p class="error">${escapeHtml(result.message)}</p>`;
        }


      } catch (error) {

        console.error(
          "Profile save error:",
          error
        );


        document.getElementById("message").innerHTML =
          '<p class="error">Error saving profile. Please try again.</p>';
      }

    }
  );

}


// ==================== RESUME ====================

const uploadResumeButton =
  document.getElementById(
    "uploadResumeButton"
  );


if (uploadResumeButton) {

  const resumeFile =
    document.getElementById(
      "resumeFile"
    );


  const resumeMessage =
    document.getElementById(
      "resumeMessage"
    );


  const resumeInfo =
    document.getElementById(
      "resumeInfo"
    );


  const jobSeekerId =
    localStorage.getItem(
      "jobSeekerId"
    );


  async function loadResume() {

    if (!jobSeekerId) {

      if (resumeInfo) {

        resumeInfo.innerHTML =
          "<p>Please login as a Job Seeker first.</p>";
      }

      return;
    }


    try {

      const response =
        await fetch(
          `${JAVA_API}/resume/${jobSeekerId}`
        );


      const result =
        await response.json();


      if (result.success) {

        resumeInfo.innerHTML = `

          <div class="resume-card">

            <p>
              <strong>Resume:</strong>
              ${escapeHtml(result.fileName)}
            </p>

            <p>
              <strong>Upload Date:</strong>
              ${escapeHtml(result.uploadDate)}
            </p>

            <button
              type="button"
              onclick="deleteResume(${result.resumeId})">
              Delete Resume
            </button>

          </div>

        `;

      } else {

        resumeInfo.innerHTML =
          "<p>No resume uploaded.</p>";
      }


    } catch (error) {

      console.error(
        "Resume loading error:",
        error
      );


      resumeInfo.innerHTML =
        "<p>Error loading resume.</p>";
    }

  }


  uploadResumeButton.addEventListener(
    "click",
    async function () {

      const file =
        resumeFile.files[0];


      if (!file) {

        resumeMessage.innerHTML =
          '<p class="error">Please select a PDF or DOCX file.</p>';

        return;
      }


      const fileName =
        file.name.toLowerCase();


      if (
        !fileName.endsWith(".pdf") &&
        !fileName.endsWith(".docx")
      ) {

        resumeMessage.innerHTML =
          '<p class="error">Only PDF and DOCX files are allowed.</p>';

        return;
      }


      if (!jobSeekerId) {

        resumeMessage.innerHTML =
          '<p class="error">Please login as a Job Seeker first.</p>';

        return;
      }


      const formData =
        new FormData();


      formData.append(
        "resume",
        file
      );


      formData.append(
        "jobSeekerId",
        jobSeekerId
      );


      try {

        const response =
          await fetch(
            `${JAVA_API}/upload-resume`,
            {

              method: "POST",

              body: formData

            }
          );


        const result =
          await response.json();


        if (result.success) {

          resumeMessage.innerHTML =
            `<p class="success">${escapeHtml(result.message)}</p>`;


          resumeFile.value = "";


          await loadResume();


        } else {

          resumeMessage.innerHTML =
            `<p class="error">${escapeHtml(result.message)}</p>`;
        }


      } catch (error) {

        console.error(
          "Resume upload error:",
          error
        );


        resumeMessage.innerHTML =
          '<p class="error">Error uploading resume.</p>';
      }

    }
  );


  window.deleteResume =
    async function (resumeId) {

      try {

        const response =
          await fetch(
            `${JAVA_API}/delete-resume/${resumeId}`,
            {
              method: "DELETE"
            }
          );


        const result =
          await response.json();


        if (result.success) {

          resumeMessage.innerHTML =
            `<p class="success">${escapeHtml(result.message)}</p>`;


          await loadResume();


        } else {

          resumeMessage.innerHTML =
            `<p class="error">${escapeHtml(result.message)}</p>`;
        }


      } catch (error) {

        console.error(
          "Resume delete error:",
          error
        );


        resumeMessage.innerHTML =
          '<p class="error">Error deleting resume.</p>';
      }

    };


  loadResume();

}


// ==================== SKILL GAP ====================

const checkSkillGapButton =
  document.getElementById(
    "checkSkillGapButton"
  );


const skillGapResult =
  document.getElementById(
    "skillGapResult"
  );


if (checkSkillGapButton) {

  checkSkillGapButton.addEventListener(
    "click",
    async function () {

      const skillsInput =
        document.getElementById(
          "skills"
        );


      const requiredSkillsInput =
        document.getElementById(
          "requiredSkills"
        );


      if (
        !skillsInput ||
        !requiredSkillsInput
      ) {

        return;
      }


      const candidateSkills =
        skillsInput.value;


      const requiredSkills =
        requiredSkillsInput.value;


      if (!candidateSkills.trim()) {

        skillGapResult.innerHTML =
          '<p class="error">Please enter your skills first.</p>';

        return;
      }


      if (!requiredSkills.trim()) {

        skillGapResult.innerHTML =
          '<p class="error">Please enter required job skills.</p>';

        return;
      }


      skillGapResult.innerHTML =
        "<p>Checking skill gap...</p>";


      try {

        const response =
          await fetch(
            `${ML_API}/skill-gap`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({

                  candidate_skills:
                    candidateSkills,

                  required_skills:
                    requiredSkills

                })

            }
          );


        const result =
          await response.json();


        if (response.ok) {
          const renderSkills = (skills, kind) => skills.length
            ? `<ul class="analysis-chips ${kind}">${skills.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>`
            : '<p class="analysis-empty">None identified</p>';
          skillGapResult.innerHTML = `
            <div class="analysis-summary"><strong>${result.coverage}%</strong><span>of listed job skills appear on your profile (${result.matched_count}/${result.required_count})</span></div>
            <h3>Skills you already list</h3>${renderSkills(result.matched_skills || [], "matched")}
            <h3>Skills not listed</h3>${renderSkills(result.missing_skills || [], "missing")}
            <p class="analysis-note">${escapeHtml(result.suggestion)}</p>`;
        } else {
          skillGapResult.innerHTML = `<p class="error">${escapeHtml(result.error || "Unable to compare these skills.")}</p>`;
        }


      } catch (error) {

        console.error(
          "Skill gap error:",
          error
        );


        skillGapResult.innerHTML =
          '<p class="error">Unable to connect to the ML service.</p>';
      }

    }
  );

}


// ==================== POST JOB ====================

const jobForm =
  document.getElementById(
    "jobForm"
  );


if (jobForm) {

  const employerIdInput =
    document.getElementById(
      "employerId"
    );


  const employerId =
    localStorage.getItem(
      "employerId"
    );


  if (employerIdInput) {

    employerIdInput.value =
      employerId || "";
  }


  jobForm.addEventListener(
    "submit",
    async function (e) {

      e.preventDefault();


      const currentEmployerId =
        localStorage.getItem(
          "employerId"
        );


      if (!currentEmployerId) {

        document.getElementById("message").innerHTML =
          '<p class="error">Please login as an Employer first.</p>';

        return;
      }


      const jobData = {

        employerId:
          parseInt(currentEmployerId),

        jobTitle:
          document.getElementById(
            "jobTitle"
          ).value,

        jobDescription:
          document.getElementById(
            "jobDescription"
          ).value,

        requiredSkills:
          document.getElementById(
            "requiredSkills"
          ).value,

        location:
          document.getElementById(
            "location"
          ).value,

        salary:
          parseFloat(
            document.getElementById(
              "salary"
            ).value
          ),

        jobType:
          document.getElementById(
            "jobType"
          ).value,

        experienceRequired:
          parseInt(
            document.getElementById(
              "experienceRequired"
            ).value
          )

      };


      try {

        const response =
          await fetch(
            `${JAVA_API}/post-job`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(jobData)

            }
          );


        const result =
          await response.json();


        const messageDiv =
          document.getElementById(
            "message"
          );


        if (result.success) {

          messageDiv.innerHTML =
            `<p class="success">${escapeHtml(result.message)}</p>`;


          jobForm.reset();


          if (employerIdInput) {

            employerIdInput.value =
              currentEmployerId;
          }


        } else {

          messageDiv.innerHTML =
            `<p class="error">${escapeHtml(result.message)}</p>`;
        }


      } catch (error) {

        console.error(
          "Job posting error:",
          error
        );


        document.getElementById(
          "message"
        ).innerHTML =
          '<p class="error">Error posting job. Please try again.</p>';
      }

    }
  );

}


// ==================== JOB SEARCH + MATCHING ====================

const searchForm =
  document.getElementById(
    "searchForm"
  );


const jobListings =
  document.getElementById(
    "jobListings"
  );


if (searchForm && jobListings) {

  async function loadJobs(
    keyword = ""
  ) {

    try {

      let url =
        `${JAVA_API}/jobs`;


      if (keyword.trim() !== "") {

        url =
          `${JAVA_API}/search-jobs?keyword=${encodeURIComponent(keyword)}`;
      }


      const response =
        await fetch(url);


      const result =
        await response.json();


      jobListings.innerHTML = "";


      const jobs =
        Object.values(
          result.jobs || {}
        );


      if (
        !result.success ||
        jobs.length === 0
      ) {

        jobListings.innerHTML =
          "<p>No jobs found.</p>";

        return;
      }


      const jobSeekerId =
        localStorage.getItem(
          "jobSeekerId"
        );


      let resumeText = "";


      if (jobSeekerId) {

        try {

          const resumeResponse =
            await fetch(
              `${JAVA_API}/resume/${jobSeekerId}`
            );


          const resumeResult =
            await resumeResponse.json();


          if (
            resumeResult.success &&
            resumeResult.resumeText
          ) {

            resumeText =
              resumeResult.resumeText;
          }


        } catch (error) {

          console.error(
            "Resume fetch error:",
            error
          );
        }

      }


      for (const job of jobs) {

        let matchScore = null;


        if (resumeText) {

          const jobText =
            `${job.jobTitle || ""}
             ${job.jobDescription || ""}
             ${job.requiredSkills || ""}`;


          try {

            const matchResponse =
              await fetch(
                `${ML_API}/match-score`,
                {

                  method: "POST",

                  headers: {
                    "Content-Type":
                      "application/json"
                  },

                  body:
                    JSON.stringify({

                      resume_text:
                        resumeText,

                      job_text:
                        jobText

                    })

                }
              );


            const matchResult =
              await matchResponse.json();


            if (
              matchResult.score !==
              undefined
            ) {

              matchScore =
                matchResult.score;
            }


          } catch (error) {

            console.error(
              "Match score error:",
              error
            );
          }

        }


        const jobCard =
          document.createElement(
            "div"
          );


        jobCard.className =
          "job-card";


        jobCard.innerHTML = `

          <h3>
            ${escapeHtml(job.jobTitle || "Job")}
          </h3>

          <p>
            <strong>Company:</strong>
            ${escapeHtml(job.companyName || "N/A")}
          </p>

          <p>
            ${escapeHtml(job.jobDescription || "")}
          </p>

          <p>
            <strong>Location:</strong>
            ${escapeHtml(job.location || "N/A")}
          </p>

          <p>
            <strong>Required Skills:</strong>
            ${escapeHtml(job.requiredSkills || "N/A")}
          </p>

          <p>
            <strong>Resume text similarity:</strong>

            <span class="match-badge">
              ${matchScore === null ? "Add a resume to compare" : `${Number(matchScore).toFixed(1)}%`}
            </span>
          </p>

          <a
            href="job-details.html?id=${encodeURIComponent(job.id)}"
            class="job-link">
            View Job
          </a>

        `;


        jobListings.appendChild(
          jobCard
        );

      }


    } catch (error) {

      console.error(
        "Job loading error:",
        error
      );


      jobListings.innerHTML =
        '<p class="error">Error loading jobs. Make sure the Java backend is running.</p>';
    }

  }


  searchForm.addEventListener(
    "submit",
    function (e) {

      e.preventDefault();


      const keyword =
        document.getElementById(
          "keyword"
        ).value;


      loadJobs(keyword);

    }
  );


  loadJobs();

}


// ==================== JOB DETAILS + ATS ====================

const jobDetails =
  document.getElementById(
    "jobDetails"
  );


const saveJobBtn =
  document.getElementById(
    "saveJobBtn"
  );


const applyJobBtn =
  document.getElementById(
    "applyJobBtn"
  );


const checkAtsBtn =
  document.getElementById(
    "checkAtsBtn"
  );


const atsResult =
  document.getElementById(
    "atsResult"
  );


if (jobDetails) {

  const urlParams =
    new URLSearchParams(
      window.location.search
    );


  const jobId =
    urlParams.get("id");


  let currentJob = null;


  async function loadJobDetails() {

    if (!jobId) {

      jobDetails.innerHTML =
        "<p>Invalid job ID.</p>";

      return;
    }


    try {

      const response =
        await fetch(
          `${JAVA_API}/job-details/${encodeURIComponent(jobId)}`
        );


      const result =
        await response.json();


      if (!result.success) {

        jobDetails.innerHTML =
          "<p>Job not found.</p>";

        return;
      }


      currentJob = result;

      const featureInfo = document.querySelector(".job-feature-info");
      if (featureInfo) {
        featureInfo.innerHTML = `
          <article class="job-feature-item" id="jobSkillGapSection">
            <div class="job-feature-icon">SKILLS</div>
            <div>
              <h3>Compare your skills with this role</h3>
              <p>We compare skills saved on your profile with the skills listed in this job. This is guidance, not a hiring decision.</p>
              <button type="button" id="checkJobSkillGapBtn">Compare my skills</button>
              <div id="jobSkillGapResult" aria-live="polite"></div>
            </div>
          </article>
          <article class="job-feature-item">
            <div class="job-feature-icon">MATCH</div>
            <div>
              <h3>Resume text similarity</h3>
              <p>Search results compare wording in your resume with each job description. It is a relevance hint, not a prediction of hiring success.</p>
            </div>
          </article>`;

        document.getElementById("checkJobSkillGapBtn").addEventListener("click", compareJobSkills);
      }


      jobDetails.innerHTML = `

        <h2>
          ${escapeHtml(result.jobTitle || "Job")}
        </h2>

        <p>
          <strong>Company:</strong>
          ${escapeHtml(result.companyName || "N/A")}
        </p>

        <p>
          <strong>Location:</strong>
          ${escapeHtml(result.location || "N/A")}
        </p>

        <p>
          <strong>Salary:</strong>
          ₹${result.salary || "N/A"}
        </p>

        <p>
          <strong>Job Type:</strong>
          ${escapeHtml(result.jobType || "N/A")}
        </p>

        <p>
          <strong>Experience Required:</strong>
          ${result.experienceRequired || 0}
          years
        </p>

        <p>
          <strong>Required Skills:</strong>
          ${escapeHtml(result.requiredSkills || "N/A")}
        </p>

        <p>
          <strong>Job Description:</strong>
          ${escapeHtml(result.jobDescription || "N/A")}
        </p>

      `;


    } catch (error) {

      console.error(
        "Job details error:",
        error
      );


      jobDetails.innerHTML =
        '<p class="error">Error loading job details.</p>';
    }

  }

  async function compareJobSkills() {
    const resultBox = document.getElementById("jobSkillGapResult");
    const button = document.getElementById("checkJobSkillGapBtn");
    const jobSeekerId = getSignedInJobSeekerId();
    if (!jobSeekerId) {
      resultBox.innerHTML = '<p class="error">Sign in as a job seeker to compare your profile.</p>';
      return;
    }
    if (!currentJob || !currentJob.requiredSkills) {
      resultBox.innerHTML = '<p class="error">This job does not list required skills yet.</p>';
      return;
    }

    button.disabled = true;
    resultBox.innerHTML = '<p>Comparing your profile with this job…</p>';
    try {
      const profileResponse = await fetch(`${JAVA_API}/profile-job-seeker/${encodeURIComponent(jobSeekerId)}`);
      const profile = await profileResponse.json();
      if (!profileResponse.ok || !profile.success || !profile.skills || !profile.skills.trim()) {
        resultBox.innerHTML = '<p>Add your skills to your profile first, then come back to compare.</p><a href="profile.html">Update my profile</a>';
        return;
      }

      const response = await fetch(`${ML_API}/skill-gap`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ candidate_skills: profile.skills, required_skills: currentJob.requiredSkills })
      });
      const analysis = await response.json();
      if (!response.ok) throw new Error(analysis.error || "Could not compare skills");

      const chips = (items, kind) => items.length
        ? `<ul class="analysis-chips ${kind}">${items.map((skill) => `<li>${escapeHtml(skill)}</li>`).join("")}</ul>`
        : '<p class="analysis-empty">None identified</p>';
      resultBox.innerHTML = `
        <div class="analysis-summary"><strong>${analysis.coverage}%</strong><span>of listed skills appear on your profile (${analysis.matched_count}/${analysis.required_count})</span></div>
        <h4>Skills on your profile</h4>${chips(analysis.matched_skills || [], "matched")}
        <h4>Skills not listed on your profile</h4>${chips(analysis.missing_skills || [], "missing")}
        <p class="analysis-note">${escapeHtml(analysis.suggestion)}</p>`;
    } catch (error) {
      resultBox.innerHTML = '<p class="error">Could not compare skills. Check that the Java and Python services are running.</p>';
    } finally {
      button.disabled = false;
    }
  }


  // ==================== SAVE JOB ====================

  if (saveJobBtn) {

    saveJobBtn.addEventListener(
      "click",
      async function () {

        const jobSeekerId = getSignedInJobSeekerId();


        if (!jobSeekerId) {

          document.getElementById(
            "message"
          ).innerHTML =
            '<p class="error">Please login as a Job Seeker first.</p>';

          return;
        }


        try {

          const response =
            await fetch(
              `${JAVA_API}/save-job`,
              {

                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    jobSeekerId:
                      parseInt(jobSeekerId),

                    jobId:
                      parseInt(jobId)

                  })

              }
            );


          const result =
            await response.json();


          document.getElementById(
            "message"
          ).innerHTML =
            result.success
              ? `<p class="success">${escapeHtml(result.message)}</p>`
              : `<p class="error">${escapeHtml(result.message)}</p>`;


        } catch (error) {

          console.error(
            "Save job error:",
            error
          );


          document.getElementById(
            "message"
          ).innerHTML =
            '<p class="error">Error saving job.</p>';
        }

      }
    );

  }


  // ==================== APPLY FOR JOB ====================

  if (applyJobBtn) {

    applyJobBtn.addEventListener(
      "click",
      async function () {

        const jobSeekerId = getSignedInJobSeekerId();


        if (!jobSeekerId) {

          document.getElementById(
            "message"
          ).innerHTML =
            '<p class="error">Please login as a Job Seeker first.</p>';

          return;
        }


        if (!jobId) {

          document.getElementById(
            "message"
          ).innerHTML =
            '<p class="error">Invalid job ID.</p>';

          return;
        }


        try {

          applyJobBtn.disabled =
            true;


          applyJobBtn.textContent =
            "Applying...";


          const response =
            await fetch(
              `${JAVA_API}/apply-job`,
              {

                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

                body:
                  JSON.stringify({

                    jobSeekerId:
                      parseInt(jobSeekerId),

                    jobId:
                      parseInt(jobId)

                  })

              }
            );


          const result =
            await response.json();


          if (result.success) {

            document.getElementById(
              "message"
            ).innerHTML =
              `<p class="success">${escapeHtml(result.message)}</p>`;


            applyJobBtn.textContent =
              "✓ Applied";


          } else {

            document.getElementById(
              "message"
            ).innerHTML =
              `<p class="error">${escapeHtml(result.message)}</p>`;


            applyJobBtn.disabled =
              false;


            applyJobBtn.textContent =
              "📩 Apply Now";
          }


        } catch (error) {

          console.error(
            "Apply job error:",
            error
          );


          document.getElementById(
            "message"
          ).innerHTML =
            '<p class="error">Unable to submit application. Please try again.</p>';


          applyJobBtn.disabled =
            false;


          applyJobBtn.textContent =
            "📩 Apply Now";
        }

      }
    );

  }


  // ==================== ATS SCORE ====================

  if (checkAtsBtn) {

    checkAtsBtn.addEventListener(
      "click",
      async function () {
        const originalLabel = checkAtsBtn.textContent;

        try {

          const jobSeekerId = getSignedInJobSeekerId();


          if (!jobSeekerId) {

            atsResult.innerHTML =
              '<p class="error">Sign in with a Job Seeker account to analyze your resume. <a href="login.html">Sign in</a></p>';

            return;
          }


          if (!currentJob) {

            atsResult.innerHTML =
              '<p class="error">Job details are still loading.</p>';

            return;
          }


          atsResult.innerHTML =
            "<p>Preparing your resume analysis...</p>";
          checkAtsBtn.disabled = true;
          checkAtsBtn.textContent = "Analyzing resume...";


          const resumeResponse =
            await fetch(
              `${JAVA_API}/resume/${jobSeekerId}`
            );


          const resumeResult =
            await resumeResponse.json();


          if (
            !resumeResult.success ||
            !resumeResult.resumeText
          ) {

            atsResult.innerHTML =
              '<p class="error">Upload a PDF or DOCX resume from <a href="profile.html?v=20261025-quality-pass">your profile</a>, then return here to analyze it.</p>';

            return;
          }


          const jobText =
            `${currentJob.jobTitle || ""}
             ${currentJob.jobDescription || ""}
             ${currentJob.requiredSkills || ""}`;


          const atsResponse =
            await fetch(
              `${ML_API}/ats-score`,
              {

                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json"
                },

              body:
                  JSON.stringify({
                    resume_text: resumeResult.resumeText,
                    job_text: jobText,
                    required_skills: currentJob.requiredSkills || ""
                  })

              }
            );


          const atsData =
            await atsResponse.json();


          if (!atsResponse.ok || atsData.score === undefined) {
            throw new Error(atsData.error || "Unable to calculate resume alignment.");
          }

          const score = Math.max(0, Math.min(100, Number(atsData.score) || 0));
          const dimensions = atsData.dimensions || {};
          const weights = atsData.weights || {};
          const metrics = [
            ["Required skills", dimensions.skill_coverage, `${weights.skill_coverage || 0}% of score`],
            ["Job keywords", dimensions.keyword_coverage, `${weights.keyword_coverage || 0}% of score`],
            ["Text similarity", dimensions.text_similarity, `${weights.text_similarity || 0}% of score`],
            ["Resume structure", dimensions.resume_structure, `${weights.resume_structure || 0}% of score`]
          ].filter(([, value, weight]) => value !== null && value !== undefined && !weight.startsWith("0%"));
          const metricCards = metrics.map(([label, value, weight]) => `
            <article class="ats-metric-card">
              <span>${escapeHtml(label)}</span>
              <strong>${Number(value).toFixed(0)}%</strong>
              <small>${escapeHtml(weight)}</small>
              <div class="ats-metric-track"><i style="width:${Math.max(0, Math.min(100, Number(value)))}%"></i></div>
            </article>`).join("");
          const chips = (items, kind, empty) => items && items.length
            ? `<ul class="analysis-chips ${kind}">${items.map((term) => `<li>${escapeHtml(term)}</li>`).join("")}</ul>`
            : `<p class="analysis-empty">${empty}</p>`;
          const suggestions = (atsData.suggestions || []).map((item) => {
            const suggestion = typeof item === "string"
              ? { priority: "medium", title: "Recommendation", detail: item }
              : item;
            return `<article class="ats-suggestion-item priority-${escapeHtml(suggestion.priority || "medium")}">
              <span>${escapeHtml((suggestion.priority || "medium").toUpperCase())}</span>
              <div><h4>${escapeHtml(suggestion.title || "Recommendation")}</h4><p>${escapeHtml(suggestion.detail || "")}</p></div>
            </article>`;
          }).join("");
          const signals = atsData.signals || {};

          atsResult.innerHTML = `
            <div class="ats-result-card">
              <div class="ats-score-hero">
                <div class="ats-score-ring" style="--score:${score}%"><div><strong>${score.toFixed(0)}<small>%</small></strong><span>alignment</span></div></div>
                <div class="ats-score-copy"><span class="ats-overline">YOUR ROLE ALIGNMENT</span><h3>${escapeHtml(atsData.score_label || "Resume analysis complete")}</h3><p>Compared your resume with this job's requirements and description.</p><span class="ats-method-pill">Python NLP | scikit-learn TF-IDF</span></div>
              </div>
              <section class="ats-metrics-grid" aria-label="Analysis breakdown">${metricCards}</section>
              <div class="ats-analysis-columns">
                <section><h3>Required skills found</h3>${chips(atsData.matched_skills, "matched", "No listed skills were detected in the resume text.")}</section>
                <section><h3>Skills to review</h3>${chips(atsData.missing_skills, "missing", "All listed required skills were detected.")}</section>
              </div>
              <details class="ats-keyword-details"><summary>View keyword comparison</summary>
                <h4>Detected in your resume</h4>${chips(atsData.matched_keywords, "matched", "No job terms detected yet.")}
                <h4>Not detected</h4>${chips(atsData.missing_keywords, "missing", "No missing terms detected.")}
              </details>
              <section class="ats-signals"><h3>Resume quality signals</h3><div class="ats-signal-grid">
                <div><strong>${Number(signals.resume_word_count || 0).toLocaleString()}</strong><span>words analyzed</span></div>
                <div><strong>${Number(signals.sections_found || 0)} / ${Number(signals.sections_total || 0)}</strong><span>sections found</span></div>
                <div><strong>${Number(signals.quantified_lines || 0)}</strong><span>measurable results</span></div>
                <div><strong>${Number(signals.action_verb_uses || 0)}</strong><span>action verb uses</span></div>
              </div></section>
              <section class="ats-recommendations"><div class="ats-section-heading"><div><span class="ats-overline">NEXT STEPS</span><h3>Ways to strengthen your resume</h3></div><span class="ats-recommendation-count">${(atsData.suggestions || []).length} tips</span></div>${suggestions || '<p class="analysis-empty">No recommendations available.</p>'}</section>
              <p class="analysis-note">${escapeHtml(atsData.score_note || "An estimate only. Review your resume and the role yourself.")}</p>
            </div>`;


        } catch (error) {

          console.error(
            "ATS score error:",
            error
          );


          atsResult.innerHTML = `<p class="error">${escapeHtml(error.message || "Unable to connect to the Python analysis service. Check that it is running on port 5000.")}</p>`;
        } finally {
          checkAtsBtn.disabled = false;
          checkAtsBtn.textContent = originalLabel;
        }

      }
    );

  }


  loadJobDetails();

}


// ==================== LOGOUT ====================

const logoutLinks =
  document.querySelectorAll(
    'a[href="login.html"]'
  );


logoutLinks.forEach((link) => {

  if (
    link.textContent
      .toLowerCase()
      .includes("logout")
  ) {

    link.addEventListener(
      "click",
      function () {

        localStorage.removeItem(
          "userId"
        );

        localStorage.removeItem(
          "userName"
        );

        localStorage.removeItem("userEmail");

        localStorage.removeItem(
          "userType"
        );

        localStorage.removeItem(
          "jobSeekerId"
        );

        localStorage.removeItem(
          "employerId"
        );

      }
    );

  }

});

// ==================== EMPLOYER COMPANY PROFILE ====================


const employerProfileForm =
  document.getElementById(
    "employerProfileForm"
  );


if (employerProfileForm) {

  const employerId =
    localStorage.getItem(
      "employerId"
    );


  const companyName =
    document.getElementById(
      "companyName"
    );


  const companyDescription =
    document.getElementById(
      "companyDescription"
    );


  const companySize =
    document.getElementById(
      "companySize"
    );


  const industry =
    document.getElementById(
      "industry"
    );

  const foundedYear = document.getElementById("foundedYear");
  const companyWebsite = document.getElementById("companyWebsite");


  const messageDiv =
    document.getElementById(
      "message"
    );


  // ================= LOAD COMPANY PROFILE =================

  async function loadEmployerProfile() {

    if (!employerId) {

      messageDiv.innerHTML =
        '<p class="error">Please login as an Employer first.</p>';

      return;
    }


    try {

      const response =
        await fetch(
          `${JAVA_API}/profile-employer/${employerId}`
        );


      const result =
        await response.json();


      if (
        result.success &&
        result.profile
      ) {

        // Registered company name
        companyName.value =
          result.profile.companyName || "";


        // Company profile information
        companyDescription.value =
          result.profile.companyDescription ||
          "";


        companySize.value =
          result.profile.companySize ||
          "";


        industry.value =
          result.profile.industry ||
          "";

        foundedYear.value = result.profile.foundedYear || "";
        companyWebsite.value = result.profile.website || "";

      }


    } catch (error) {

      console.error(
        "Employer profile load error:",
        error
      );


      messageDiv.innerHTML =
        '<p class="error">Unable to load company profile.</p>';
    }

  }


  // ================= SAVE COMPANY PROFILE =================

  employerProfileForm.addEventListener(
    "submit",
    async function (e) {

      e.preventDefault();


      if (!employerId) {

        messageDiv.innerHTML =
          '<p class="error">Please login as an Employer first.</p>';

        return;
      }


      const profileData = {

        employerId:
          parseInt(employerId),

        companyName: companyName.value.trim(),

        companyDescription:
          companyDescription.value,

        companySize:
          companySize.value,

        industry:
          industry.value,

        foundedYear: foundedYear.value || null,

        website: companyWebsite.value.trim()

      };


      try {

        const response =
          await fetch(
            `${JAVA_API}/profile-employer`,
            {

              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify(
                  profileData
                )

            }
          );


        const result =
          await response.json();


        if (result.success) {

          messageDiv.innerHTML =
            `<p class="success">${escapeHtml(result.message)}</p>`;


        } else {

          messageDiv.innerHTML =
            `<p class="error">${escapeHtml(result.message)}</p>`;
        }


      } catch (error) {

        console.error(
          "Employer profile save error:",
          error
        );


        messageDiv.innerHTML =
          '<p class="error">Error saving company profile. Please try again.</p>';
      }

    }
  );


  // Load existing company profile
  loadEmployerProfile();

}

// ==================== APPLICATION REVIEW ====================

const employerJobsContainer = document.getElementById("employerJobs");

if (employerJobsContainer) {
  const jobsList = document.getElementById("jobsList");
  const employerId = localStorage.getItem("employerId");

  async function loadEmployerApplications() {
    if (!employerId) {
      jobsList.innerHTML = '<p class="error">Sign in as an employer to review applications.</p>';
      return;
    }

    try {
      const jobsResponse = await fetch(`${JAVA_API}/employer-jobs/${encodeURIComponent(employerId)}`);
      const jobsResult = await jobsResponse.json();
      if (!jobsResponse.ok || !jobsResult.success) throw new Error("Could not load jobs");

      const jobs = Object.values(jobsResult.jobs || {});
      if (!jobs.length) {
        jobsList.innerHTML = '<div class="empty-state"><h3>No jobs posted yet</h3><p>Your applications will appear here after you post a job.</p><a href="post-job.html">Post your first job</a></div>';
        return;
      }

      jobsList.innerHTML = jobs.map((job) => `
        <article class="job-card employer-job-card">
          <div class="employer-job-heading">
            <div><h3>${escapeHtml(job.jobTitle || "Job")}</h3><p>${escapeHtml(job.location || "Location not specified")} · ${escapeHtml(job.jobType || "Role")}</p></div>
            <span class="applicant-count" data-count-for="${Number(job.id)}">Loading applicants</span>
          </div>
          <section class="applicant-list" aria-label="Applicants for ${escapeHtml(job.jobTitle || "job")}" data-applicants-for="${Number(job.id)}"><p>Checking for applications…</p></section>
        </article>
      `).join("");

      await Promise.all(jobs.map(async (job) => {
        const list = jobsList.querySelector(`[data-applicants-for="${Number(job.id)}"]`);
        const count = jobsList.querySelector(`[data-count-for="${Number(job.id)}"]`);
        try {
          const response = await fetch(`${JAVA_API}/job-applicants/${encodeURIComponent(job.id)}?employerId=${encodeURIComponent(employerId)}`);
          const result = await response.json();
          if (!response.ok || !result.success) throw new Error("Could not load applicants");
          const applicants = result.applicants || [];
          count.textContent = `${applicants.length} ${applicants.length === 1 ? "application" : "applications"}`;
          list.innerHTML = applicants.length ? applicants.map((applicant) => {
            const accepted = applicant.status === "Shortlisted";
            const rejected = applicant.status === "Rejected";
            const state = accepted ? "Accepted" : rejected ? "Rejected" : "Under review";
            const resumeLink = applicant.resumeId
              ? `<a class="resume-link" href="${JAVA_API}/application-resume/${encodeURIComponent(applicant.resumeId)}?employerId=${encodeURIComponent(employerId)}" target="_blank" rel="noopener">View resume · ${escapeHtml(applicant.resumeFileName || "Open file")}</a>`
              : '<span class="resume-unavailable">Resume unavailable</span>';
            const decisionControls = accepted || rejected
              ? `<p class="decision-recorded">${accepted ? "You accepted this application." : "You declined this application."}</p>`
              : `<div class="application-actions">
                  <button type="button" data-application-decision="Shortlisted" data-application-id="${Number(applicant.applicationId)}">Accept</button>
                  <button type="button" class="secondary-decision" data-application-decision="Rejected" data-application-id="${Number(applicant.applicationId)}">Reject</button>
                </div>`;
            return `<article class="applicant-card">
              <div class="applicant-details"><div><h4>${escapeHtml(applicant.name || "Candidate")}</h4><a href="mailto:${encodeURIComponent(applicant.email || "")}">${escapeHtml(applicant.email || "")}</a></div><span class="application-status status-${state.toLowerCase()}">${state}</span></div>
              <p class="application-date">Applied ${escapeHtml(applicant.applicationDate || "recently")}</p>
              ${resumeLink}
              ${decisionControls}
            </article>`;
          }).join("") : '<p class="empty-applicants">No applications yet. We’ll list new candidates here.</p>';
        } catch (error) {
          count.textContent = "Applications unavailable";
          list.innerHTML = '<p class="error">Could not load applications. Try refreshing the page.</p>';
        }
      }));
    } catch (error) {
      jobsList.innerHTML = '<p class="error">Could not load your jobs. Check that the Java API is running.</p>';
    }
  }

  jobsList.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-application-decision]");
    if (!button) return;
    button.disabled = true;
    try {
      const response = await fetch(`${JAVA_API}/application-status/${encodeURIComponent(button.dataset.applicationId)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: button.dataset.applicationDecision, employerId: Number(employerId) })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Update failed");
      await loadEmployerApplications();
    } catch (error) {
      button.disabled = false;
      window.alert("We couldn’t update this application. Please try again.");
    }
  });

  loadEmployerApplications();
  window.setInterval(loadEmployerApplications, 30000);
}

// Show employer decisions on the job seeker dashboard, and refresh while it is open.
const applicationUpdates = document.getElementById("applicationUpdates");
if (applicationUpdates) {
  const jobSeekerId = localStorage.getItem("jobSeekerId");
  async function loadApplicationUpdates() {
    if (!jobSeekerId) {
      applicationUpdates.innerHTML = '<p>Sign in as a job seeker to see your application updates.</p>';
      return;
    }
    try {
      const response = await fetch(`${JAVA_API}/applications/${encodeURIComponent(jobSeekerId)}`);
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error("Could not load updates");
      const applications = result.applications || [];
      applicationUpdates.innerHTML = applications.length ? applications.map((application) => {
        const decided = application.status === "Shortlisted" || application.status === "Rejected";
        const state = application.status === "Shortlisted" ? "Accepted" : application.status === "Rejected" ? "Not selected" : "Under review";
        const updateText = application.status === "Shortlisted"
          ? `Good news — ${escapeHtml(application.companyName)} would like to move forward with your application.`
          : application.status === "Rejected"
            ? `${escapeHtml(application.companyName)} has finished reviewing this application.`
            : "Your application has been sent. We’ll show an update here when it’s reviewed.";
        return `<article class="candidate-application ${decided ? "has-decision" : ""}">
          <div><p class="application-company">${escapeHtml(application.companyName || "Employer")}</p><h3>${escapeHtml(application.jobTitle || "Job")}</h3><p>${escapeHtml(updateText)}</p></div>
          <span class="application-status status-${state.toLowerCase().replaceAll(" ", "-")}">${state}</span>
        </article>`;
      }).join("") : '<p>You haven’t applied to any jobs yet. When you do, you can follow each application here.</p>';
    } catch (error) {
      applicationUpdates.innerHTML = '<p class="error">Your application updates couldn’t load. Please refresh the page.</p>';
    }
  }
  loadApplicationUpdates();
  window.setInterval(loadApplicationUpdates, 30000);
}
