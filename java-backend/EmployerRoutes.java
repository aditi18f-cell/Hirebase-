import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.mindrot.jbcrypt.BCrypt;
import spark.Request;
import spark.Response;
import spark.Route;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class EmployerRoutes {
    private static final Gson gson = new Gson();

    // Register a new employer
    public static Route registerEmployer = (Request request, Response response) -> {
        try {
            JsonObject json = gson.fromJson(request.body(), JsonObject.class);

            String companyName = json.get("companyName").getAsString();
            String email = json.get("email").getAsString();
            String password = json.get("password").getAsString();
            String phone = json.get("phone").getAsString();
            String address = json.get("address").getAsString();
            String website = json.get("website").getAsString();

            // Hash the password using jBCrypt
            String hashedPassword = BCrypt.hashpw(password, BCrypt.gensalt(12));

            Connection conn = DbConnect.getConnection();
            String sql = "INSERT INTO employer (company_name, email, password, phone, address, website) VALUES (?, ?, ?, ?, ?, ?)";
            PreparedStatement pstmt = conn.prepareStatement(sql);

            pstmt.setString(1, companyName);
            pstmt.setString(2, email);
            pstmt.setString(3, hashedPassword);
            pstmt.setString(4, phone);
            pstmt.setString(5, address);
            pstmt.setString(6, website);

            int rowsAffected = pstmt.executeUpdate();

            pstmt.close();
            conn.close();

            Map<String, Object> result = new HashMap<>();

            if (rowsAffected > 0) {
                result.put("success", true);
                result.put("message", "Employer registered successfully");
            } else {
                result.put("success", false);
                result.put("message", "Registration failed");
            }

            return gson.toJson(result);

        } catch (Exception e) {
            e.printStackTrace();

            Map<String, Object> error = new HashMap<>();
            error.put("success", false);
            error.put("message", "Error during registration: " + e.getMessage());

            return gson.toJson(error);
        }
    };

    // Login employer
    public static Route loginEmployer = (Request request, Response response) -> {
        try {
            JsonObject json = gson.fromJson(request.body(), JsonObject.class);

            String email = json.get("email").getAsString();
            String password = json.get("password").getAsString();

            Connection conn = DbConnect.getConnection();
            String sql = "SELECT id, company_name, email, password FROM employer WHERE email = ?";
            PreparedStatement pstmt = conn.prepareStatement(sql);

            pstmt.setString(1, email);

            ResultSet rs = pstmt.executeQuery();

            Map<String, Object> result = new HashMap<>();

            if (rs.next()) {
                String hashedPassword = rs.getString("password");

                if (BCrypt.checkpw(password, hashedPassword)) {
                    result.put("success", true);
                    result.put("message", "Login successful");
                    result.put("userId", rs.getInt("id"));
                    result.put("userName", rs.getString("company_name"));
                    result.put("userType", "employer");
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