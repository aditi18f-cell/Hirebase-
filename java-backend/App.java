import com.google.gson.Gson;

import static spark.Spark.*;

public class App {

    private static final Gson gson = new Gson();

    public static void main(String[] args) {

        port(4567);

        before((request, response) -> {
            response.header("Access-Control-Allow-Origin", "*");
            response.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
            response.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
            response.type("application/json");
        });

        options("/*", (request, response) -> {
            response.status(200);
            return "";
        });

        // ==================== AUTHENTICATION ====================

        post("/login", AuthenticationRoutes::login);
        get("/account-exists/:userType/:userId", AuthenticationRoutes::accountExists);
        post("/register-job-seeker", JobSeekerRoutes.registerJobSeeker);
        post("/login-job-seeker", JobSeekerRoutes.loginJobSeeker);

        post("/register-employer", EmployerRoutes.registerEmployer);
        post("/login-employer", EmployerRoutes.loginEmployer);


        // ==================== PROFILES ====================

        post("/profile-job-seeker", JobSeekerProfileRoutes.createOrUpdateProfile);
        get("/profile-job-seeker/:jobSeekerId", JobSeekerProfileRoutes.getProfile);

        post("/profile-employer", EmployerProfileRoutes.createOrUpdateProfile);
        get("/profile-employer/:employerId", EmployerProfileRoutes.getProfile);


        // ==================== JOBS ====================

        post("/post-job", JobRoutes::postJob);
        get("/jobs", JobRoutes::getAllJobs);
        get("/search-jobs", JobRoutes::searchJobs);
        get("/job-details/:jobId", JobRoutes::getJobDetails);

        post("/save-job", JobRoutes::saveJob);
        get("/saved-jobs/:jobSeekerId", JobRoutes::getSavedJobs);
        delete("/saved-jobs/:jobSeekerId/:jobId", JobRoutes::removeSavedJob);

        get("/employer-jobs/:employerId", JobRoutes::getEmployerJobs);
        put("/update-job/:jobId", JobRoutes::updateJob);
        delete("/delete-job/:jobId", JobRoutes::deleteJob);


        // ==================== RESUME ====================

        post("/upload-resume", ResumeRoutes::uploadResume);
        get("/resume/:jobSeekerId", ResumeRoutes::getResume);
        delete("/delete-resume/:resumeId", ResumeRoutes::deleteResume);
        get("/application-resume/:resumeId", ResumeRoutes::downloadApplicationResume);


        // ==================== APPLICATIONS ====================

        post("/apply-job", ApplicationRoutes::applyJob);

        get("/applications/:jobSeekerId",
                ApplicationRoutes::getApplications);

        get("/job-applicants/:jobId",
                ApplicationRoutes::getApplicants);

        put("/application-status/:applicationId",
                ApplicationRoutes::updateApplicationStatus);


        // ==================== HOME ====================

        get("/", (request, response) ->
                gson.toJson(
                        new String[]{"Hirebase API is running"}
                )
        );


        System.out.println(
                "Hirebase Job Portal API is running on port 4567"
        );
    }
}
