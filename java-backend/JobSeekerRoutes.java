import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.mindrot.jbcrypt.BCrypt;
import spark.Request;
import spark.Response;
import spark.Route;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLIntegrityConstraintViolationException;
import java.util.HashMap;
import java.util.Map;

import static spark.Spark.*;

public class JobSeekerRoutes {
    private static final Gson gson = new Gson();

    // Register a new job seeker
    public static Route registerJobSeeker = (Request request, Response response) -> {
        try {
            // Parse JSON from request body
            JsonObject json = gson.fromJson(request.body(), JsonObject.class);

            String fullName = json.get("fullName").getAsString();
            String email = json.get("email").getAsString();
            String password = json.get("password").getAsString();
            String phone = json.get("phone").getAsString();
            String address = json.get("address").getAsString();

            // Hash the password using jBCrypt
            String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt(12));

            // Insert into database
            Connection conn = DbConnect.getConnection();
            try (PreparedStatement existingEmployer = conn.prepareStatement(
                    "SELECT id FROM employer WHERE email = ?")) {
                existingEmployer.setString(1, email);
                try (ResultSet existing = existingEmployer.executeQuery()) {
                    if (existing.next()) {
                        conn.close();
                        response.status(409);
                        return gson.toJson(Map.of("success", false,
                                "message", "This email is already linked to an employer account. Sign in with that account or use another email."));
                    }
                }
            }
            String sql = "INSERT INTO job_seeker (full_name, email, password, phone, address) VALUES (?, ?, ?, ?, ?)";
            PreparedStatement pstmt = conn.prepareStatement(sql);

            pstmt.setString(1, fullName);
            pstmt.setString(2, email);
            pstmt.setString(3, hashedPassword);
            pstmt.setString(4, phone);
            pstmt.setString(5, address);

            int rowsAffected = pstmt.executeUpdate();

            pstmt.close();
            conn.close();

            // Return response
            Map<String, Object> result = new HashMap<>();

            if (rowsAffected > 0) {
                result.put("success", true);
                result.put("message", "Job seeker registered successfully");
            } else {
                result.put("success", false);
                result.put("message", "Registration failed");
            }

            return gson.toJson(result);

        } catch (SQLIntegrityConstraintViolationException e) {
            response.status(409);
            return gson.toJson(Map.of("success", false,
                    "message", "An account with this email already exists. Sign in or use another email."));
        } catch (Exception e) {
            e.printStackTrace();

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error during registration: " + e.getMessage());

            return gson.toJson(error);
        }
    };

    // Login job seeker
    public static Route loginJobSeeker = (Request request, Response response) -> {
        try {
            // Parse JSON from request body
            JsonObject json = gson.fromJson(request.body(), JsonObject.class);

            String email = json.get("email").getAsString();
            String password = json.get("password").getAsString();

            // Get user from database
            Connection conn = DbConnect.getConnection();
            String sql = "SELECT id, full_name, email, password FROM job_seeker WHERE email = ?";
            PreparedStatement pstmt = conn.prepareStatement(sql);

            pstmt.setString(1, email);

            ResultSet rs = pstmt.executeQuery();

            Map<String, Object> result = new HashMap<>();

            if (rs.next()) {

                // Verify password using jBCrypt
                String hashedPassword = rs.getString("password");

                if (BCrypt.checkpw(password, hashedPassword)) {

                    // Login successful
                    result.put("success", true);
                    result.put("message", "Login successful");
                    result.put("userId", rs.getInt("id"));
                    result.put("userName", rs.getString("full_name"));
                    result.put("userType", "job_seeker");

                } else {
                    result.put("success", false);
                    result.put("message", "Invalid password");
                }

            } else {
                result.put("success", false);
                result.put("message", "User not found");
            }

            rs.close();
            pstmt.close();
            conn.close();

            return gson.toJson(result);

        } catch (Exception e) {
            e.printStackTrace();

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error during login: " + e.getMessage());

            return gson.toJson(error);
        }
    };
}
