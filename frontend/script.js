// Hirebase Frontend JavaScript

const JAVA_API = "http://localhost:4567";
const ML_API = "http://localhost:5000";

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
          `<p class="success">${result.message}</p>`;

        this.reset();

      } else {

        messageDiv.innerHTML =
          `<p class="error">${result.message}</p>`;
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


    const selectedUserType =
      document.querySelector(
        'input[name="userType"]:checked'
      );


    if (!selectedUserType) {

      document.getElementById("message").innerHTML =
        '<p class="error">Please select Job Seeker or Employer.</p>';

      return;
    }


    const userType =
      selectedUserType.value;


    const loginUrl =
      userType === "job_seeker"
        ? `${JAVA_API}/login-job-seeker`
        : `${JAVA_API}/login-employer`;


    try {

      const response =
        await fetch(loginUrl, {

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


      if (result.success) {

        messageDiv.innerHTML =
          `<p class="success">${result.message}</p>`;


        localStorage.setItem(
          "userId",
          result.userId
        );


        localStorage.setItem(
          "userName",
          result.userName || ""
        );


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
          `<p class="error">${result.message}</p>`;
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
            `<p class="success">${result.message}</p>`;

        } else {

          messageDiv.innerHTML =
            `<p class="error">${result.message}</p>`;
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
              ${result.fileName}
            </p>

            <p>
              <strong>Upload Date:</strong>
              ${result.uploadDate}
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
            `<p class="success">${result.message}</p>`;


          resumeFile.value = "";


          await loadResume();


        } else {

          resumeMessage.innerHTML =
            `<p class="error">${result.message}</p>`;
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
            `<p class="success">${result.message}</p>`;


          await loadResume();


        } else {

          resumeMessage.innerHTML =
            `<p class="error">${result.message}</p>`;
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

          let missingHTML = "";


          if (
            result.missing_skills &&
            result.missing_skills.length > 0
          ) {

            missingHTML = `

              <h3>
                Missing Skills
              </h3>

              <ul>

                ${result.missing_skills
                  .map(
                    (skill) =>
                      `<li>${skill}</li>`
                  )
                  .join("")}

              </ul>

            `;

          } else {

            missingHTML =
              "<p>No missing skills. Great!</p>";
          }


          skillGapResult.innerHTML = `

            ${missingHTML}

            <p>
              <strong>Suggestion:</strong>
              ${result.suggestion}
            </p>

          `;


        } else {

          skillGapResult.innerHTML =
            '<p class="error">Unable to check skill gap.</p>';
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
            `<p class="success">${result.message}</p>`;


          jobForm.reset();


          if (employerIdInput) {

            employerIdInput.value =
              currentEmployerId;
          }


        } else {

          messageDiv.innerHTML =
            `<p class="error">${result.message}</p>`;
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

        let matchScore = 0;


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
            ${job.jobTitle || "Job"}
          </h3>

          <p>
            <strong>Company:</strong>
            ${job.companyName || "N/A"}
          </p>

          <p>
            ${job.jobDescription || ""}
          </p>

          <p>
            <strong>Location:</strong>
            ${job.location || "N/A"}
          </p>

          <p>
            <strong>Required Skills:</strong>
            ${job.requiredSkills || "N/A"}
          </p>

          <p>
            <strong>Match:</strong>

            <span class="match-badge">
              ${matchScore}%
            </span>
          </p>

          <a
            href="job-details.html?id=${job.id}"
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
          `${JAVA_API}/job-details/${jobId}`
        );


      const result =
        await response.json();


      if (!result.success) {

        jobDetails.innerHTML =
          "<p>Job not found.</p>";

        return;
      }


      currentJob = result;


      jobDetails.innerHTML = `

        <h2>
          ${result.jobTitle || "Job"}
        </h2>

        <p>
          <strong>Company:</strong>
          ${result.companyName || "N/A"}
        </p>

        <p>
          <strong>Location:</strong>
          ${result.location || "N/A"}
        </p>

        <p>
          <strong>Salary:</strong>
          ₹${result.salary || "N/A"}
        </p>

        <p>
          <strong>Job Type:</strong>
          ${result.jobType || "N/A"}
        </p>

        <p>
          <strong>Experience Required:</strong>
          ${result.experienceRequired || 0}
          years
        </p>

        <p>
          <strong>Required Skills:</strong>
          ${result.requiredSkills || "N/A"}
        </p>

        <p>
          <strong>Job Description:</strong>
          ${result.jobDescription || "N/A"}
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


  // ==================== SAVE JOB ====================

  if (saveJobBtn) {

    saveJobBtn.addEventListener(
      "click",
      async function () {

        const jobSeekerId =
          localStorage.getItem(
            "jobSeekerId"
          );


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
              ? `<p class="success">${result.message}</p>`
              : `<p class="error">${result.message}</p>`;


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

        const jobSeekerId =
          localStorage.getItem(
            "jobSeekerId"
          );


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
              `<p class="success">${result.message}</p>`;


            applyJobBtn.textContent =
              "✓ Applied";


          } else {

            document.getElementById(
              "message"
            ).innerHTML =
              `<p class="error">${result.message}</p>`;


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

        try {

          const jobSeekerId =
            localStorage.getItem(
              "jobSeekerId"
            );


          if (!jobSeekerId) {

            atsResult.innerHTML =
              '<p class="error">Please login as a Job Seeker first.</p>';

            return;
          }


          if (!currentJob) {

            atsResult.innerHTML =
              '<p class="error">Job details are still loading.</p>';

            return;
          }


          atsResult.innerHTML =
            "<p>Checking ATS score...</p>";


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
              '<p class="error">Please upload your resume first.</p>';

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

                    resume_text:
                      resumeResult.resumeText,

                    job_text:
                      jobText

                  })

              }
            );


          const atsData =
            await atsResponse.json();


          if (
            atsData.score !==
            undefined
          ) {

            let suggestionsHTML =
              "";


            if (
              atsData.suggestions &&
              atsData.suggestions.length > 0
            ) {

              suggestionsHTML = `

                <h3>
                  Suggestions
                </h3>

                <ul>

                  ${atsData.suggestions
                    .map(
                      (suggestion) =>
                        `<li>${suggestion}</li>`
                    )
                    .join("")}

                </ul>

              `;
            }


            atsResult.innerHTML = `

              <div class="ats-result-card">

                <h3>
                  ATS Score:
                  ${atsData.score}%
                </h3>

                <p>
                  Your resume matches this
                  job based on keywords and
                  resume sections.
                </p>

                ${suggestionsHTML}

              </div>

            `;


          } else {

            atsResult.innerHTML =
              '<p class="error">Unable to calculate ATS score.</p>';
          }


        } catch (error) {

          console.error(
            "ATS score error:",
            error
          );


          atsResult.innerHTML =
            '<p class="error">Unable to connect to the ML service.</p>';
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

        companyDescription:
          companyDescription.value,

        companySize:
          companySize.value,

        industry:
          industry.value

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
            `<p class="success">${result.message}</p>`;


        } else {

          messageDiv.innerHTML =
            `<p class="error">${result.message}</p>`;
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