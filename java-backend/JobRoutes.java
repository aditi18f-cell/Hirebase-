import com.google.gson.Gson;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.sql.*;
import java.util.*;

public class JobRoutes {

    private static final Gson gson = new Gson();


    // ==================== POST JOB ====================

    public static Object postJob(Request request, Response response) {

        try {

            JsonObject data =
                    gson.fromJson(request.body(), JsonObject.class);

            int employerId =
                    data.get("employerId").getAsInt();

            String jobTitle =
                    data.get("jobTitle").getAsString();

            String jobDescription =
                    data.get("jobDescription").getAsString();

            String location =
                    data.get("location").getAsString();

            double salary =
                    data.get("salary").getAsDouble();

            String jobType =
                    data.get("jobType").getAsString();

            int experienceRequired =
                    data.get("experienceRequired").getAsInt();

            String requiredSkills = "";
            String preferredSkills = "";

            if (data.has("requiredSkills")
                    && !data.get("requiredSkills").isJsonNull()) {

                requiredSkills =
                        data.get("requiredSkills").getAsString();
            }

            if (data.has("preferredSkills") && !data.get("preferredSkills").isJsonNull()) {
                preferredSkills = data.get("preferredSkills").getAsString();
            }


            String sql =
                    "INSERT INTO jobs " +
                    "(employer_id, job_title, job_description, " +
                    "location, salary, job_type, experience_required, required_skills, preferred_skills) " +
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";


            Connection conn =
                    DbConnect.getConnection();

            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, employerId);
            pstmt.setString(2, jobTitle);
            pstmt.setString(3, jobDescription);
            pstmt.setString(4, location);
            pstmt.setDouble(5, salary);
            pstmt.setString(6, jobType);
            pstmt.setInt(7, experienceRequired);
            pstmt.setString(8, requiredSkills);
            pstmt.setString(9, preferredSkills);


            int rows =
                    pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            if (rows > 0) {

                response.status(200);

                return gson.toJson(
                        Map.of(
                                "success", true,
                                "message", "Job posted successfully"
                        )
                );
            }


            response.status(400);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", "Job could not be posted"
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== GET ALL JOBS ====================

    public static Object getAllJobs(Request request, Response response) {

        List<Map<String, Object>> jobsList =
                new ArrayList<>();

        try {

            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "j.id, " +
                    "j.job_title, " +
                    "j.job_description, " +
                    "j.location, " +
                    "j.salary, " +
                    "j.job_type, " +
                    "j.experience_required, " +
                    "j.required_skills, " +
                    "j.preferred_skills, " +
                    "j.posted_at, " +
                    "e.company_name " +
                    "FROM jobs j " +
                    "JOIN employer e " +
                    "ON j.employer_id = e.id " +
                    "ORDER BY j.posted_at DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> job =
                        new LinkedHashMap<>();

                job.put("id",
                        rs.getInt("id"));

                job.put("jobTitle",
                        rs.getString("job_title"));

                job.put("jobDescription",
                        rs.getString("job_description"));

                job.put("location",
                        rs.getString("location"));

                job.put("salary",
                        rs.getDouble("salary"));

                job.put("jobType",
                        rs.getString("job_type"));

                job.put("experienceRequired",
                        rs.getInt("experience_required"));

                job.put("requiredSkills",
                        rs.getString("required_skills"));

                job.put("preferredSkills",
                        rs.getString("preferred_skills"));

                job.put("postedAt",
                        rs.getString("posted_at"));

                job.put("companyName",
                        rs.getString("company_name"));


                jobsList.add(job);
            }


            rs.close();
            pstmt.close();
            conn.close();


            Map<String, Object> jobsObject =
                    new LinkedHashMap<>();


            for (int i = 0; i < jobsList.size(); i++) {

                jobsObject.put(
                        String.valueOf(i),
                        jobsList.get(i)
                );
            }


            Map<String, Object> result =
                    new LinkedHashMap<>();

            result.put("success", true);
            result.put("jobs", jobsObject);
            result.put("count", jobsList.size());


            return gson.toJson(result);


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== SEARCH JOBS ====================

    public static Object searchJobs(Request request, Response response) {

        List<Map<String, Object>> jobsList =
                new ArrayList<>();

        try {

            String keyword =
                    request.queryParams("keyword");


            if (keyword == null) {
                keyword = "";
            }


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "j.id, " +
                    "j.job_title, " +
                    "j.job_description, " +
                    "j.location, " +
                    "j.salary, " +
                    "j.job_type, " +
                    "j.experience_required, " +
                    "j.required_skills, " +
                    "j.preferred_skills, " +
                    "j.posted_at, " +
                    "e.company_name " +
                    "FROM jobs j " +
                    "JOIN employer e " +
                    "ON j.employer_id = e.id " +
                    "WHERE j.job_title LIKE ? " +
                    "OR j.job_description LIKE ? " +
                    "OR j.required_skills LIKE ? " +
                    "OR j.preferred_skills LIKE ? " +
                    "OR e.company_name LIKE ? " +
                    "ORDER BY j.posted_at DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);


            String searchValue =
                    "%" + keyword + "%";


            pstmt.setString(1, searchValue);
            pstmt.setString(2, searchValue);
            pstmt.setString(3, searchValue);
            pstmt.setString(4, searchValue);
            pstmt.setString(5, searchValue);


            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> job =
                        new LinkedHashMap<>();


                job.put("id",
                        rs.getInt("id"));

                job.put("jobTitle",
                        rs.getString("job_title"));

                job.put("jobDescription",
                        rs.getString("job_description"));

                job.put("location",
                        rs.getString("location"));

                job.put("salary",
                        rs.getDouble("salary"));

                job.put("jobType",
                        rs.getString("job_type"));

                job.put("experienceRequired",
                        rs.getInt("experience_required"));

                job.put("requiredSkills",
                        rs.getString("required_skills"));

                job.put("preferredSkills",
                        rs.getString("preferred_skills"));

                job.put("postedAt",
                        rs.getString("posted_at"));

                job.put("companyName",
                        rs.getString("company_name"));


                jobsList.add(job);
            }


            rs.close();
            pstmt.close();
            conn.close();


            Map<String, Object> jobsObject =
                    new LinkedHashMap<>();


            for (int i = 0; i < jobsList.size(); i++) {

                jobsObject.put(
                        String.valueOf(i),
                        jobsList.get(i)
                );
            }


            Map<String, Object> result =
                    new LinkedHashMap<>();

            result.put("success", true);
            result.put("jobs", jobsObject);
            result.put("count", jobsList.size());


            return gson.toJson(result);


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== JOB DETAILS ====================

    public static Object getJobDetails(
            Request request,
            Response response) {

        try {

            int jobId =
                    Integer.parseInt(
                            request.params(":jobId")
                    );


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "j.id, " +
                    "j.job_title, " +
                    "j.job_description, " +
                    "j.location, " +
                    "j.salary, " +
                    "j.job_type, " +
                    "j.experience_required, " +
                    "j.required_skills, " +
                    "j.preferred_skills, " +
                    "j.posted_at, " +
                    "e.company_name " +
                    "FROM jobs j " +
                    "JOIN employer e " +
                    "ON j.employer_id = e.id " +
                    "WHERE j.id = ?";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, jobId);


            ResultSet rs =
                    pstmt.executeQuery();


            if (!rs.next()) {

                rs.close();
                pstmt.close();
                conn.close();

                response.status(404);

                return gson.toJson(
                        Map.of(
                                "success", false,
                                "message", "Job not found"
                        )
                );
            }


            Map<String, Object> result =
                    new LinkedHashMap<>();


            result.put("success", true);

            result.put(
                    "id",
                    rs.getInt("id")
            );

            result.put(
                    "jobTitle",
                    rs.getString("job_title")
            );

            result.put(
                    "jobDescription",
                    rs.getString("job_description")
            );

            result.put(
                    "location",
                    rs.getString("location")
            );

            result.put(
                    "salary",
                    rs.getDouble("salary")
            );

            result.put(
                    "jobType",
                    rs.getString("job_type")
            );

            result.put(
                    "experienceRequired",
                    rs.getInt("experience_required")
            );

            result.put(
                    "requiredSkills",
                    rs.getString("required_skills")
            );

            result.put(
                    "preferredSkills",
                    rs.getString("preferred_skills")
            );

            result.put(
                    "postedAt",
                    rs.getString("posted_at")
            );

            result.put(
                    "companyName",
                    rs.getString("company_name")
            );


            rs.close();
            pstmt.close();
            conn.close();


            return gson.toJson(result);


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== SAVE JOB ====================

    public static Object saveJob(
            Request request,
            Response response) {

        try {

            JsonObject data =
                    gson.fromJson(
                            request.body(),
                            JsonObject.class
                    );


            int jobSeekerId =
                    data.get("jobSeekerId").getAsInt();

            int jobId =
                    data.get("jobId").getAsInt();


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "INSERT INTO saved_jobs " +
                    "(job_seeker_id, job_id) " +
                    "VALUES (?, ?)";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);


            pstmt.setInt(1, jobSeekerId);
            pstmt.setInt(2, jobId);


            pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            return gson.toJson(
                    Map.of(
                            "success", true,
                            "message", "Job saved successfully"
                    )
            );


        } catch (SQLIntegrityConstraintViolationException e) {

            response.status(400);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", "Job is already saved"
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== SAVED JOBS ====================

    public static Object getSavedJobs(
            Request request,
            Response response) {

        List<Map<String, Object>> jobsList =
                new ArrayList<>();

        try {

            int jobSeekerId =
                    Integer.parseInt(
                            request.params(":jobSeekerId")
                    );


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "j.id, " +
                    "j.job_title, " +
                    "j.job_description, " +
                    "j.location, " +
                    "j.salary, " +
                    "j.job_type, " +
                    "j.experience_required, " +
                    "j.required_skills, " +
                    "j.preferred_skills, " +
                    "j.posted_at, " +
                    "e.company_name " +
                    "FROM saved_jobs s " +
                    "JOIN jobs j ON s.job_id = j.id " +
                    "JOIN employer e ON j.employer_id = e.id " +
                    "WHERE s.job_seeker_id = ? " +
                    "ORDER BY j.posted_at DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, jobSeekerId);


            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> job =
                        new LinkedHashMap<>();


                job.put("id",
                        rs.getInt("id"));

                job.put("jobTitle",
                        rs.getString("job_title"));

                job.put("jobDescription",
                        rs.getString("job_description"));

                job.put("location",
                        rs.getString("location"));

                job.put("salary",
                        rs.getDouble("salary"));

                job.put("jobType",
                        rs.getString("job_type"));

                job.put("experienceRequired",
                        rs.getInt("experience_required"));

                job.put("requiredSkills",
                        rs.getString("required_skills"));

                job.put("preferredSkills",
                        rs.getString("preferred_skills"));

                job.put("postedAt",
                        rs.getString("posted_at"));

                job.put("companyName",
                        rs.getString("company_name"));


                jobsList.add(job);
            }


            rs.close();
            pstmt.close();
            conn.close();


            Map<String, Object> jobsObject =
                    new LinkedHashMap<>();


            for (int i = 0; i < jobsList.size(); i++) {

                jobsObject.put(
                        String.valueOf(i),
                        jobsList.get(i)
                );
            }


            return gson.toJson(
                    Map.of(
                            "success", true,
                            "jobs", jobsObject,
                            "count", jobsList.size()
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // Remove a saved role for one job seeker.
    public static Object removeSavedJob(Request request, Response response) {
        try {
            int jobSeekerId = Integer.parseInt(request.params(":jobSeekerId"));
            int jobId = Integer.parseInt(request.params(":jobId"));
            if (jobSeekerId <= 0 || jobId <= 0) {
                response.status(400);
                return gson.toJson(Map.of("success", false, "message", "Invalid account or job ID."));
            }

            try (Connection connection = DbConnect.getConnection()) {
                if (connection == null) {
                    response.status(500);
                    return gson.toJson(Map.of("success", false, "message", "Database connection failed."));
                }
                try (PreparedStatement statement = connection.prepareStatement(
                        "DELETE FROM saved_jobs WHERE job_seeker_id = ? AND job_id = ?")) {
                    statement.setInt(1, jobSeekerId);
                    statement.setInt(2, jobId);
                    int rows = statement.executeUpdate();
                    if (rows == 0) {
                        response.status(404);
                        return gson.toJson(Map.of("success", false, "message", "This role is not in your saved jobs."));
                    }
                }
            }

            return gson.toJson(Map.of("success", true, "message", "Role removed from your saved jobs."));
        } catch (NumberFormatException e) {
            response.status(400);
            return gson.toJson(Map.of("success", false, "message", "Invalid account or job ID."));
        } catch (Exception e) {
            response.status(500);
            return gson.toJson(Map.of("success", false, "message", "Unable to remove this role right now."));
        }
    }


    // ==================== EMPLOYER JOBS ====================

    public static Object getEmployerJobs(
            Request request,
            Response response) {

        List<Map<String, Object>> jobsList =
                new ArrayList<>();

        try {

            int employerId =
                    Integer.parseInt(
                            request.params(":employerId")
                    );


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "id, " +
                    "job_title, " +
                    "job_description, " +
                    "location, " +
                    "salary, " +
                    "job_type, " +
                    "experience_required, " +
                    "required_skills, " +
                    "preferred_skills, " +
                    "posted_at " +
                    "FROM jobs " +
                    "WHERE employer_id = ? " +
                    "ORDER BY posted_at DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, employerId);


            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> job =
                        new LinkedHashMap<>();


                job.put("id",
                        rs.getInt("id"));

                job.put("jobTitle",
                        rs.getString("job_title"));

                job.put("jobDescription",
                        rs.getString("job_description"));

                job.put("location",
                        rs.getString("location"));

                job.put("salary",
                        rs.getDouble("salary"));

                job.put("jobType",
                        rs.getString("job_type"));

                job.put("experienceRequired",
                        rs.getInt("experience_required"));

                job.put("requiredSkills",
                        rs.getString("required_skills"));

                job.put("preferredSkills",
                        rs.getString("preferred_skills"));

                job.put("postedAt",
                        rs.getString("posted_at"));


                jobsList.add(job);
            }


            rs.close();
            pstmt.close();
            conn.close();


            Map<String, Object> jobsObject =
                    new LinkedHashMap<>();


            for (int i = 0; i < jobsList.size(); i++) {

                jobsObject.put(
                        String.valueOf(i),
                        jobsList.get(i)
                );
            }


            return gson.toJson(
                    Map.of(
                            "success", true,
                            "jobs", jobsObject,
                            "count", jobsList.size()
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== UPDATE JOB ====================

    public static Object updateJob(
            Request request,
            Response response) {

        try {

            int jobId =
                    Integer.parseInt(
                            request.params(":jobId")
                    );


            JsonObject data =
                    gson.fromJson(
                            request.body(),
                            JsonObject.class
                    );


            String jobTitle =
                    data.get("jobTitle").getAsString();

            String jobDescription =
                    data.get("jobDescription").getAsString();

            String location =
                    data.get("location").getAsString();

            double salary =
                    data.get("salary").getAsDouble();

            String jobType =
                    data.get("jobType").getAsString();

            int experienceRequired =
                    data.get("experienceRequired").getAsInt();

            String requiredSkills = "";
            String preferredSkills = "";

            if (data.has("requiredSkills")
                    && !data.get("requiredSkills").isJsonNull()) {

                requiredSkills =
                        data.get("requiredSkills").getAsString();
            }

            if (data.has("preferredSkills") && !data.get("preferredSkills").isJsonNull()) {
                preferredSkills = data.get("preferredSkills").getAsString();
            }


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "UPDATE jobs SET " +
                    "job_title = ?, " +
                    "job_description = ?, " +
                    "location = ?, " +
                    "salary = ?, " +
                    "job_type = ?, " +
                    "experience_required = ?, " +
                    "required_skills = ?, " +
                    "preferred_skills = ? " +
                    "WHERE id = ?";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);


            pstmt.setString(1, jobTitle);
            pstmt.setString(2, jobDescription);
            pstmt.setString(3, location);
            pstmt.setDouble(4, salary);
            pstmt.setString(5, jobType);

            // Correct: experience is an integer
            pstmt.setInt(6, experienceRequired);

            pstmt.setString(7, requiredSkills);
            pstmt.setString(8, preferredSkills);
            pstmt.setInt(9, jobId);


            int rows =
                    pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            if (rows > 0) {

                return gson.toJson(
                        Map.of(
                                "success", true,
                                "message", "Job updated successfully"
                        )
                );
            }


            response.status(404);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", "Job not found"
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }


    // ==================== DELETE JOB ====================

    public static Object deleteJob(
            Request request,
            Response response) {

        try {

            int jobId =
                    Integer.parseInt(
                            request.params(":jobId")
                    );


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "DELETE FROM jobs WHERE id = ?";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, jobId);


            int rows =
                    pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            if (rows > 0) {

                return gson.toJson(
                        Map.of(
                                "success", true,
                                "message", "Job deleted successfully"
                        )
                );
            }


            response.status(404);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", "Job not found"
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message", e.getMessage()
                    )
            );
        }
    }
}
