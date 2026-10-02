import com.google.gson.Gson;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;

import java.sql.*;
import java.util.*;

public class ApplicationRoutes {

    private static final Gson gson = new Gson();


    // ==================== APPLY FOR JOB ====================

    public static Object applyJob(
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


            // Get the candidate's resume
            String resumeSql =
                    "SELECT id FROM resumes " +
                    "WHERE job_seeker_id = ? " +
                    "ORDER BY id DESC LIMIT 1";


            PreparedStatement resumeStmt =
                    conn.prepareStatement(resumeSql);

            resumeStmt.setInt(1, jobSeekerId);

            ResultSet resumeRs =
                    resumeStmt.executeQuery();


            if (!resumeRs.next()) {

                resumeRs.close();
                resumeStmt.close();
                conn.close();

                response.status(400);

                return gson.toJson(
                        Map.of(
                                "success", false,
                                "message",
                                "Please upload your resume before applying"
                        )
                );
            }


            int resumeId =
                    resumeRs.getInt("id");


            resumeRs.close();
            resumeStmt.close();


            // Check if the candidate already applied
            String checkSql =
                    "SELECT id FROM applications " +
                    "WHERE job_seeker_id = ? " +
                    "AND job_id = ?";


            PreparedStatement checkStmt =
                    conn.prepareStatement(checkSql);

            checkStmt.setInt(1, jobSeekerId);
            checkStmt.setInt(2, jobId);


            ResultSet checkRs =
                    checkStmt.executeQuery();


            if (checkRs.next()) {

                checkRs.close();
                checkStmt.close();
                conn.close();

                response.status(400);

                return gson.toJson(
                        Map.of(
                                "success", false,
                                "message",
                                "You have already applied for this job"
                        )
                );
            }


            checkRs.close();
            checkStmt.close();


            // Create application
            String sql =
                    "INSERT INTO applications " +
                    "(job_seeker_id, resume_id, job_id, status) " +
                    "VALUES (?, ?, ?, ?)";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);


            pstmt.setInt(1, jobSeekerId);
            pstmt.setInt(2, resumeId);
            pstmt.setInt(3, jobId);
            pstmt.setString(4, "Applied");


            int rows =
                    pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            if (rows > 0) {

                response.status(200);

                return gson.toJson(
                        Map.of(
                                "success", true,
                                "message",
                                "Application submitted successfully"
                        )
                );
            }


            response.status(400);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message",
                            "Application could not be submitted"
                    )
            );


        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message",
                            e.getMessage()
                    )
            );
        }
    }


    // ==================== JOB SEEKER APPLICATIONS ====================

    public static Object getApplications(
            Request request,
            Response response) {

        List<Map<String, Object>> applications =
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
                    "a.id, " +
                    "a.job_id, " +
                    "a.resume_id, " +
                    "a.application_date, " +
                    "a.status, " +
                    "j.job_title, " +
                    "j.location, " +
                    "j.job_type, " +
                    "e.company_name " +
                    "FROM applications a " +
                    "JOIN jobs j ON a.job_id = j.id " +
                    "JOIN employer e ON j.employer_id = e.id " +
                    "WHERE a.job_seeker_id = ? " +
                    "ORDER BY a.application_date DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, jobSeekerId);


            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> application =
                        new LinkedHashMap<>();

                application.put(
                        "id",
                        rs.getInt("id")
                );

                application.put(
                        "jobId",
                        rs.getInt("job_id")
                );

                application.put(
                        "resumeId",
                        rs.getInt("resume_id")
                );

                application.put(
                        "applicationDate",
                        rs.getString("application_date")
                );

                application.put(
                        "status",
                        rs.getString("status")
                );

                application.put(
                        "jobTitle",
                        rs.getString("job_title")
                );

                application.put(
                        "location",
                        rs.getString("location")
                );

                application.put(
                        "jobType",
                        rs.getString("job_type")
                );

                application.put(
                        "companyName",
                        rs.getString("company_name")
                );


                applications.add(application);
            }


            rs.close();
            pstmt.close();
            conn.close();


            return gson.toJson(
                    Map.of(
                            "success", true,
                            "applications", applications,
                            "count", applications.size()
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


    // ==================== EMPLOYER APPLICANTS ====================

    public static Object getApplicants(
            Request request,
            Response response) {

        List<Map<String, Object>> applicants =
                new ArrayList<>();

        try {

            int jobId =
                    Integer.parseInt(
                            request.params(":jobId")
                    );

            String employerIdValue = request.queryParams("employerId");
            if (employerIdValue == null || employerIdValue.isBlank()) {
                response.status(400);
                return gson.toJson(Map.of("success", false, "message", "Employer ID is required."));
            }
            int employerId = Integer.parseInt(employerIdValue);


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "SELECT " +
                    "a.id AS application_id, " +
                    "a.application_date, " +
                    "a.status, " +
                    "js.id AS job_seeker_id, " +
                    "js.full_name AS applicant_name, " +
                    "js.email, " +
                    "a.resume_id, " +
                    "r.resume_file_name " +
                    "FROM applications a " +
                    "JOIN job_seeker js " +
                    "ON a.job_seeker_id = js.id " +
                    "JOIN jobs j ON a.job_id = j.id " +
                    "LEFT JOIN resumes r ON a.resume_id = r.id " +
                    "WHERE a.job_id = ? AND j.employer_id = ? " +
                    "ORDER BY a.application_date DESC";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(1, jobId);
            pstmt.setInt(2, employerId);


            ResultSet rs =
                    pstmt.executeQuery();


            while (rs.next()) {

                Map<String, Object> applicant =
                        new LinkedHashMap<>();

                applicant.put(
                        "applicationId",
                        rs.getInt("application_id")
                );

                applicant.put(
                        "applicationDate",
                        rs.getString("application_date")
                );

                applicant.put(
                        "status",
                        rs.getString("status")
                );

                applicant.put(
                        "jobSeekerId",
                        rs.getInt("job_seeker_id")
                );

                applicant.put(
                        "name",
                        rs.getString("applicant_name")
                );

                applicant.put(
                        "email",
                        rs.getString("email")
                );

                applicant.put(
                        "resumeId",
                        rs.getInt("resume_id")
                );

                applicant.put(
                        "resumeFileName",
                        rs.getString("resume_file_name")
                );


                applicants.add(applicant);
            }


            rs.close();
            pstmt.close();
            conn.close();


            return gson.toJson(
                    Map.of(
                            "success", true,
                            "applicants", applicants,
                            "count", applicants.size()
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


    // ==================== UPDATE APPLICATION STATUS ====================

    public static Object updateApplicationStatus(
            Request request,
            Response response) {

        try {

            int applicationId =
                    Integer.parseInt(
                            request.params(":applicationId")
                    );


            JsonObject data =
                    gson.fromJson(
                            request.body(),
                            JsonObject.class
                    );


            String status =
                    data.get("status").getAsString();
            int employerId = data.get("employerId").getAsInt();


            if (!status.equals("Applied")
                    && !status.equals("Shortlisted")
                    && !status.equals("Rejected")) {

                response.status(400);

                return gson.toJson(
                        Map.of(
                                "success", false,
                                "message",
                                "Invalid application status"
                        )
                );
            }


            Connection conn =
                    DbConnect.getConnection();


            String sql =
                    "UPDATE applications a " +
                    "JOIN jobs j ON a.job_id = j.id " +
                    "SET a.status = ? " +
                    "WHERE a.id = ? AND j.employer_id = ?";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);


            pstmt.setString(1, status);
            pstmt.setInt(2, applicationId);
            pstmt.setInt(3, employerId);


            int rows =
                    pstmt.executeUpdate();


            pstmt.close();
            conn.close();


            if (rows > 0) {

                return gson.toJson(
                        Map.of(
                                "success", true,
                                "message",
                                "Application status updated successfully"
                        )
                );
            }


            response.status(404);

            return gson.toJson(
                    Map.of(
                            "success", false,
                            "message",
                            "Application not found"
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
