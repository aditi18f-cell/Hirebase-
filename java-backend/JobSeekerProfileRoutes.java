import com.google.gson.Gson;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;
import spark.Route;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.HashMap;
import java.util.Map;

import static spark.Spark.*;

public class JobSeekerProfileRoutes {
    private static final Gson gson = new Gson();
    
    // Create or update job seeker profile
    public static Route createOrUpdateProfile = (Request request, Response response) -> {
        try {
            // Parse JSON from request body
            JsonObject json = gson.fromJson(request.body(), JsonObject.class);
            
            int jobSeekerId = json.get("jobSeekerId").getAsInt();
            String education = json.get("education").getAsString();
            String experience = json.get("experience").getAsString();
            String skills = json.get("skills").getAsString();
            
            // Check if profile already exists
            Connection conn = DbConnect.getConnection();
            String checkSql = "SELECT id FROM job_seeker_profiles WHERE job_seeker_id = ?";
            PreparedStatement checkStmt = conn.prepareStatement(checkSql);
            checkStmt.setInt(1, jobSeekerId);
            ResultSet rs = checkStmt.executeQuery();
            
            Map<String, Object> result = new HashMap<>();
            
            if (rs.next()) {
                // Update existing profile
                String updateSql = "UPDATE job_seeker_profiles SET education = ?, experience = ?, skills = ? WHERE job_seeker_id = ?";
                PreparedStatement updateStmt = conn.prepareStatement(updateSql);
                updateStmt.setString(1, education);
                updateStmt.setString(2, experience);
                updateStmt.setString(3, skills);
                updateStmt.setInt(4, jobSeekerId);
                
                int rowsAffected = updateStmt.executeUpdate();
                updateStmt.close();
                
                if (rowsAffected > 0) {
                    result.put("success", true);
                    result.put("message", "Profile updated successfully");
                } else {
                    result.put("success", false);
                    result.put("message", "Failed to update profile");
                }
            } else {
                // Create new profile
                String insertSql = "INSERT INTO job_seeker_profiles (job_seeker_id, education, experience, skills) VALUES (?, ?, ?, ?)";
                PreparedStatement insertStmt = conn.prepareStatement(insertSql);
                insertStmt.setInt(1, jobSeekerId);
                insertStmt.setString(2, education);
                insertStmt.setString(3, experience);
                insertStmt.setString(4, skills);
                
                int rowsAffected = insertStmt.executeUpdate();
                insertStmt.close();
                
                if (rowsAffected > 0) {
                    result.put("success", true);
                    result.put("message", "Profile created successfully");
                } else {
                    result.put("success", false);
                    result.put("message", "Failed to create profile");
                }
            }
            
            rs.close();
            checkStmt.close();
            conn.close();
            
            return gson.toJson(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error during profile operation: " + e.getMessage());
            return gson.toJson(error);
        }
    };
    
    // Get job seeker profile
    public static Route getProfile = (Request request, Response response) -> {
        try {
            int jobSeekerId = Integer.parseInt(request.params(":jobSeekerId"));
            
            Connection conn = DbConnect.getConnection();
            String sql = "SELECT id, job_seeker_id, education, experience, skills FROM job_seeker_profiles WHERE job_seeker_id = ?";
            PreparedStatement pstmt = conn.prepareStatement(sql);
            pstmt.setInt(1, jobSeekerId);
            ResultSet rs = pstmt.executeQuery();
            
            Map<String, Object> result = new HashMap<>();
            
            if (rs.next()) {
                result.put("success", true);
                result.put("profileId", rs.getInt("id"));
                result.put("jobSeekerId", rs.getInt("job_seeker_id"));
                result.put("education", rs.getString("education"));
                result.put("experience", rs.getString("experience"));
                result.put("skills", rs.getString("skills"));
            } else {
                result.put("success", false);
                result.put("message", "Profile not found");
            }
            
            rs.close();
            pstmt.close();
            conn.close();
            
            return gson.toJson(result);
        } catch (Exception e) {
            e.printStackTrace();
            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error fetching profile: " + e.getMessage());
            return gson.toJson(error);
        }
    };
}