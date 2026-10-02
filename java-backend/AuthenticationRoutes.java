import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.mindrot.jbcrypt.BCrypt;
import spark.Request;
import spark.Response;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.LinkedHashMap;
import java.util.Map;

public final class AuthenticationRoutes {
    private static final Gson gson = new Gson();

    private AuthenticationRoutes() { }

    public static Object login(Request request, Response response) {
        JsonObject body;
        try {
            body = gson.fromJson(request.body(), JsonObject.class);
            if (body == null || !body.has("email") || !body.has("password")
                    || body.get("email").isJsonNull() || body.get("password").isJsonNull()) {
                response.status(400);
                return gson.toJson(Map.of("success", false, "message", "Enter your email and password."));
            }

            String email = body.get("email").getAsString().trim();
            String password = body.get("password").getAsString();
            if (email.isEmpty() || password.isEmpty()) {
                response.status(400);
                return gson.toJson(Map.of("success", false, "message", "Enter your email and password."));
            }

            Map<String, Object> account = null;
            try (Connection connection = DbConnect.getConnection()) {
                if (connection == null) {
                    response.status(500);
                    return gson.toJson(Map.of("success", false, "message", "Unable to connect to the database."));
                }

                account = findAccount(connection, "job_seeker", "full_name", email, password, "job_seeker");
                Map<String, Object> employer = findAccount(connection, "employer", "company_name", email, password, "employer");

                if (account != null && employer != null) {
                    response.status(409);
                    return gson.toJson(Map.of("success", false,
                            "message", "More than one account matches these details. Contact support to resolve the duplicate accounts."));
                }
                if (account == null) account = employer;
            }

            if (account == null) {
                response.status(401);
                return gson.toJson(Map.of("success", false, "message", "Email or password is incorrect."));
            }

            account.put("success", true);
            account.put("message", "Signed in successfully.");
            return gson.toJson(account);
        } catch (Exception e) {
            response.status(500);
            return gson.toJson(Map.of("success", false, "message", "Unable to sign in right now. Please try again."));
        }
    }

    private static Map<String, Object> findAccount(Connection connection, String table, String nameColumn,
                                                    String email, String password, String userType) throws Exception {
        String sql = "SELECT id, " + nameColumn + ", password FROM " + table + " WHERE email = ?";
        try (PreparedStatement statement = connection.prepareStatement(sql)) {
            statement.setString(1, email);
            try (ResultSet result = statement.executeQuery()) {
                if (!result.next() || !BCrypt.checkpw(password, result.getString("password"))) return null;
                Map<String, Object> account = new LinkedHashMap<>();
                account.put("userId", result.getInt("id"));
                account.put("userName", result.getString(nameColumn));
                account.put("userType", userType);
                return account;
            }
        }
    }
}
