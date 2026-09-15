import com.google.gson.Gson;
import com.google.gson.JsonObject;

import spark.Request;
import spark.Response;

import javax.servlet.MultipartConfigElement;
import javax.servlet.http.Part;

import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;

import java.net.HttpURLConnection;
import java.net.URL;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;

import java.util.UUID;

import static spark.Spark.*;

public class ResumeRoutes {

    private static final Gson gson = new Gson();

    private static final Path UPLOAD_DIRECTORY = Paths.get(System.getProperty("user.dir"))
            .resolve("uploads")
            .resolve("resumes");

    private static final String PYTHON_SERVICE_URL = "http://localhost:5000/extract-resume-text";

    public static void setupRoutes() {

        post("/upload-resume", ResumeRoutes::uploadResume);
        get("/resume/:jobSeekerId", ResumeRoutes::getResume);
        delete("/delete-resume/:resumeId", ResumeRoutes::deleteResume);
    }

    public static Object uploadResume(Request request, Response response) {

        response.type("application/json");

        try {

            /*
             * IMPORTANT:
             * Configure multipart request BEFORE reading
             * jobSeekerId or the uploaded file.
             */
            request.raw().setAttribute(
                    "org.eclipse.jetty.multipartConfig",
                    new MultipartConfigElement(
                            System.getProperty("java.io.tmpdir")));

            /*
             * Get job seeker ID from the multipart request.
             */
            String jobSeekerIdValue = request.raw().getParameter("jobSeekerId");

            if (jobSeekerIdValue == null
                    || jobSeekerIdValue.trim().isEmpty()) {

                response.status(400);

                JsonObject result = new JsonObject();

                result.addProperty("success", false);
                result.addProperty(
                        "message",
                        "Job seeker ID is missing.");

                return gson.toJson(result);
            }

            int jobSeekerId;

            try {

                jobSeekerId = Integer.parseInt(jobSeekerIdValue);

            } catch (NumberFormatException e) {

                response.status(400);

                JsonObject result = new JsonObject();

                result.addProperty("success", false);
                result.addProperty(
                        "message",
                        "Invalid job seeker ID.");

                return gson.toJson(result);
            }

            /*
             * Get uploaded resume.
             */
            Part resumePart = request.raw().getPart("resume");

            if (resumePart == null
                    || resumePart.getSize() == 0) {

                response.status(400);

                JsonObject result = new JsonObject();

                result.addProperty("success", false);
                result.addProperty(
                        "message",
                        "Please select a resume file.");

                return gson.toJson(result);
            }

            /*
             * Get original file name.
             */
            String originalFileName = resumePart.getSubmittedFileName();

            if (originalFileName == null
                    || originalFileName.trim().isEmpty()) {

                response.status(400);

                JsonObject result = new JsonObject();

                result.addProperty("success", false);
                result.addProperty(
                        "message",
                        "Invalid resume file.");

                return gson.toJson(result);
            }

            /*
             * Clean the file name.
             */
            String cleanFileName = Paths.get(originalFileName)
                    .getFileName()
                    .toString();

            String lowerFileName = cleanFileName.toLowerCase();

            /*
             * Only PDF and DOCX are allowed.
             */
            if (!lowerFileName.endsWith(".pdf")
                    && !lowerFileName.endsWith(".docx")) {

                response.status(400);

                JsonObject result = new JsonObject();

                result.addProperty("success", false);
                result.addProperty(
                        "message",
                        "Only PDF and DOCX files are allowed.");

                return gson.toJson(result);
            }

            /*
             * Create upload directory if it does not exist.
             */
            Files.createDirectories(UPLOAD_DIRECTORY);

            /*
             * Keep the correct extension.
             */
            String extension;

            if (lowerFileName.endsWith(".pdf")) {
                extension = ".pdf";
            } else {
                extension = ".docx";
            }

            /*
             * Generate a unique physical file name.
             */
            String storedFileName = UUID.randomUUID().toString()
                    + extension;

            Path destination = UPLOAD_DIRECTORY.resolve(storedFileName);

            /*
             * Save uploaded file using Java NIO.
             *
             * This avoids the Windows Part.write()
             * path problem.
             */
            try (InputStream inputStream = resumePart.getInputStream()) {

                Files.copy(
                        inputStream,
                        destination,
                        StandardCopyOption.REPLACE_EXISTING);
            }

            /*
             * Extract text using Python service.
             */
            String resumeText = "";

            try {

                resumeText = extractResumeText(
                        destination
                                .toAbsolutePath()
                                .toString());

            } catch (Exception e) {

                System.out.println(
                        "Python resume extraction failed: "
                                + e.getMessage());
            }

            /*
             * Save resume information in MySQL.
             */
            String sql = "INSERT INTO resumes "
                    + "(job_seeker_id, "
                    + "resume_file_name, "
                    + "upload_date, "
                    + "resume_text) "
                    + "VALUES (?, ?, CURRENT_TIMESTAMP, ?)";

            try (Connection connection = DbConnect.getConnection()) {

                if (connection == null) {

                    Files.deleteIfExists(destination);

                    response.status(500);

                    JsonObject result = new JsonObject();

                    result.addProperty(
                            "success",
                            false);

                    result.addProperty(
                            "message",
                            "Database connection failed.");

                    return gson.toJson(result);
                }

                try (PreparedStatement statement = connection.prepareStatement(
                        sql,
                        java.sql.Statement.RETURN_GENERATED_KEYS)) {

                    statement.setInt(
                            1,
                            jobSeekerId);

                    statement.setString(
                            2,
                            cleanFileName);

                    statement.setString(
                            3,
                            resumeText);

                    statement.executeUpdate();

                    int resumeId = 0;

                    try (ResultSet keys = statement.getGeneratedKeys()) {

                        if (keys.next()) {

                            resumeId = keys.getInt(1);
                        }
                    }

                    /*
                     * Return success response.
                     */
                    JsonObject result = new JsonObject();

                    result.addProperty(
                            "success",
                            true);

                    result.addProperty(
                            "message",
                            "Resume uploaded successfully.");

                    result.addProperty(
                            "resumeId",
                            resumeId);

                    result.addProperty(
                            "fileName",
                            cleanFileName);

                    result.addProperty(
                            "resumeText",
                            resumeText);

                    return gson.toJson(result);
                }
            }

        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            JsonObject result = new JsonObject();

            result.addProperty(
                    "success",
                    false);

            result.addProperty(
                    "message",
                    "Error during resume upload: "
                            + e.getMessage());

            return gson.toJson(result);
        }
    }

    public static Object getResume(
            Request request,
            Response response) {

        response.type("application/json");

        try {

            int jobSeekerId = Integer.parseInt(
                    request.params(
                            ":jobSeekerId"));

            String sql = "SELECT id, "
                    + "resume_file_name, "
                    + "upload_date, "
                    + "resume_text "
                    + "FROM resumes "
                    + "WHERE job_seeker_id = ? "
                    + "ORDER BY id DESC "
                    + "LIMIT 1";

            try (Connection connection = DbConnect.getConnection()) {

                if (connection == null) {

                    response.status(500);

                    JsonObject result = new JsonObject();

                    result.addProperty(
                            "success",
                            false);

                    result.addProperty(
                            "message",
                            "Database connection failed.");

                    return gson.toJson(result);
                }

                try (PreparedStatement statement = connection.prepareStatement(sql)) {

                    statement.setInt(
                            1,
                            jobSeekerId);

                    try (ResultSet resultSet = statement.executeQuery()) {

                        if (resultSet.next()) {

                            JsonObject result = new JsonObject();

                            result.addProperty(
                                    "success",
                                    true);

                            result.addProperty(
                                    "resumeId",
                                    resultSet.getInt(
                                            "id"));

                            result.addProperty(
                                    "fileName",
                                    resultSet.getString(
                                            "resume_file_name"));

                            String resumeText = resultSet.getString(
                                    "resume_text");

                            result.addProperty(
                                    "resumeText",
                                    resumeText == null
                                            ? ""
                                            : resumeText);

                            result.addProperty(
                                    "uploadDate",
                                    resultSet.getString(
                                            "upload_date"));

                            return gson.toJson(result);
                        }
                    }
                }
            }

            JsonObject result = new JsonObject();

            result.addProperty(
                    "success",
                    false);

            result.addProperty(
                    "message",
                    "No resume found for this job seeker");

            return gson.toJson(result);

        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            JsonObject result = new JsonObject();

            result.addProperty(
                    "success",
                    false);

            result.addProperty(
                    "message",
                    "Error loading resume: "
                            + e.getMessage());

            return gson.toJson(result);
        }
    }

    public static Object deleteResume(
            Request request,
            Response response) {

        response.type("application/json");

        try {

            int resumeId = Integer.parseInt(
                    request.params(
                            ":resumeId"));

            /*
             * Find the resume record first.
             */
            String selectSql = "SELECT resume_file_name "
                    + "FROM resumes "
                    + "WHERE id = ?";

            try (Connection connection = DbConnect.getConnection()) {

                if (connection == null) {

                    response.status(500);

                    JsonObject result = new JsonObject();

                    result.addProperty(
                            "success",
                            false);

                    result.addProperty(
                            "message",
                            "Database connection failed.");

                    return gson.toJson(result);
                }

                String fileName = null;

                try (PreparedStatement statement = connection.prepareStatement(
                        selectSql)) {

                    statement.setInt(
                            1,
                            resumeId);

                    try (ResultSet resultSet = statement.executeQuery()) {

                        if (resultSet.next()) {

                            fileName = resultSet.getString(
                                    "resume_file_name");
                        }
                    }
                }

                /*
                 * Delete database record.
                 */
                String deleteSql = "DELETE FROM resumes "
                        + "WHERE id = ?";

                try (PreparedStatement statement = connection.prepareStatement(
                        deleteSql)) {

                    statement.setInt(
                            1,
                            resumeId);

                    int rowsDeleted = statement.executeUpdate();

                    if (rowsDeleted == 0) {

                        response.status(404);

                        JsonObject result = new JsonObject();

                        result.addProperty(
                                "success",
                                false);

                        result.addProperty(
                                "message",
                                "Resume not found.");

                        return gson.toJson(result);
                    }
                }
            }

            /*
             * The database stores the original file name,
             * while the physical uploaded file uses a UUID.
             *
             * Therefore, the physical file is not deleted here.
             */
            JsonObject result = new JsonObject();

            result.addProperty(
                    "success",
                    true);

            result.addProperty(
                    "message",
                    "Resume deleted successfully.");

            return gson.toJson(result);

        } catch (Exception e) {

            e.printStackTrace();

            response.status(500);

            JsonObject result = new JsonObject();

            result.addProperty(
                    "success",
                    false);

            result.addProperty(
                    "message",
                    "Error deleting resume: "
                            + e.getMessage());

            return gson.toJson(result);
        }
    }

    private static String extractResumeText(
            String filePath) throws Exception {

        URL url = new URL(PYTHON_SERVICE_URL);

        HttpURLConnection connection = (HttpURLConnection) url.openConnection();

        connection.setRequestMethod("POST");

        connection.setDoOutput(true);

        connection.setRequestProperty(
                "Content-Type",
                "application/json");

        /*
         * Send file path to Python service.
         */
        JsonObject requestBody = new JsonObject();

        requestBody.addProperty(
                "file_path",
                filePath);

        byte[] requestBytes = gson.toJson(requestBody)
                .getBytes(
                        StandardCharsets.UTF_8);

        try (OutputStream outputStream = connection.getOutputStream()) {

            outputStream.write(requestBytes);
        }

        int statusCode = connection.getResponseCode();

        InputStream inputStream;

        if (statusCode >= 200
                && statusCode < 300) {

            inputStream = connection.getInputStream();

        } else {

            inputStream = connection.getErrorStream();
        }

        if (inputStream == null) {

            return "";
        }

        StringBuilder responseText = new StringBuilder();

        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(
                        inputStream,
                        StandardCharsets.UTF_8))) {

            String line;

            while ((line = reader.readLine()) != null) {

                responseText.append(line);
            }
        }

        /*
         * Python service returned an error.
         */
        if (statusCode < 200
                || statusCode >= 300) {

            System.out.println(
                    "Python service returned HTTP "
                            + statusCode);

            System.out.println(
                    "Python response: "
                            + responseText);

            return "";
        }

        /*
         * Parse Python JSON response.
         */
        JsonObject jsonResponse = gson.fromJson(
                responseText.toString(),
                JsonObject.class);

        if (jsonResponse != null
                && jsonResponse.has("text")
                && !jsonResponse
                        .get("text")
                        .isJsonNull()) {

            return jsonResponse
                    .get("text")
                    .getAsString();
        }

        /*
         * Also support resumeText response.
         */
        if (jsonResponse != null
                && jsonResponse.has("resumeText")
                && !jsonResponse
                        .get("resumeText")
                        .isJsonNull()) {

            return jsonResponse
                    .get("resumeText")
                    .getAsString();
        }

        return "";
    }
}