import com.google.gson.Gson;
import com.google.gson.JsonObject;
import spark.Request;
import spark.Response;
import spark.Route;

import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.HashMap;
import java.util.Map;

public class EmployerProfileRoutes {

    private static final Gson gson = new Gson();

    // Create or update employer profile
    public static Route createOrUpdateProfile = (Request request, Response response) -> {

        try {

            JsonObject json =
                    gson.fromJson(request.body(), JsonObject.class);

            int employerId =
                    json.get("employerId").getAsInt();

            String companyName = json.has("companyName") && !json.get("companyName").isJsonNull()
                    ? json.get("companyName").getAsString().trim() : "";

            String companyDescription =
                    json.get("companyDescription").getAsString();

            String companySize =
                    json.get("companySize").getAsString();

            String industry =
                    json.get("industry").getAsString();

            Integer foundedYear = json.has("foundedYear") && !json.get("foundedYear").isJsonNull()
                    && !json.get("foundedYear").getAsString().isBlank()
                    ? json.get("foundedYear").getAsInt() : null;
            String website = json.has("website") && !json.get("website").isJsonNull()
                    ? json.get("website").getAsString().trim() : "";


            Connection conn =
                    DbConnect.getConnection();


            // Check if company profile already exists
            String checkSql =
                    "SELECT id FROM employer_profiles WHERE employer_id = ?";

            PreparedStatement checkStmt =
                    conn.prepareStatement(checkSql);

            checkStmt.setInt(1, employerId);

            ResultSet rs =
                    checkStmt.executeQuery();


            Map<String, Object> result =
                    new HashMap<>();


            if (rs.next()) {

                // Update existing company profile
                String updateSql =
                        "UPDATE employer_profiles " +
                        "SET company_description = ?, " +
                        "company_size = ?, " +
                        "founded_year = ?, " +
                        "industry = ? " +
                        "WHERE employer_id = ?";

                PreparedStatement updateStmt =
                        conn.prepareStatement(updateSql);

                updateStmt.setString(
                        1,
                        companyDescription
                );

                updateStmt.setString(
                        2,
                        companySize
                );

                if (foundedYear == null) updateStmt.setNull(3, java.sql.Types.INTEGER);
                else updateStmt.setInt(3, foundedYear);
                updateStmt.setString(4, industry);
                updateStmt.setInt(5, employerId);


                int rowsAffected =
                        updateStmt.executeUpdate();

                updateStmt.close();


                if (rowsAffected > 0) {

                    result.put(
                            "success",
                            true
                    );

                    result.put(
                            "message",
                            "Company profile updated successfully"
                    );

                } else {

                    result.put(
                            "success",
                            false
                    );

                    result.put(
                            "message",
                            "Failed to update company profile"
                    );
                }

            } else {

                // Create new company profile
                String insertSql =
                        "INSERT INTO employer_profiles " +
                        "(employer_id, company_description, company_size, founded_year, industry) " +
                        "VALUES (?, ?, ?, ?, ?)";

                PreparedStatement insertStmt =
                        conn.prepareStatement(insertSql);

                insertStmt.setInt(
                        1,
                        employerId
                );

                insertStmt.setString(
                        2,
                        companyDescription
                );

                insertStmt.setString(
                        3,
                        companySize
                );

                if (foundedYear == null) insertStmt.setNull(4, java.sql.Types.INTEGER);
                else insertStmt.setInt(4, foundedYear);
                insertStmt.setString(5, industry);


                int rowsAffected =
                        insertStmt.executeUpdate();

                insertStmt.close();


                if (rowsAffected > 0) {

                    result.put(
                            "success",
                            true
                    );

                    result.put(
                            "message",
                            "Company profile created successfully"
                    );

                } else {

                    result.put(
                            "success",
                            false
                    );

                    result.put(
                            "message",
                            "Failed to create company profile"
                    );
                }
            }

            try (PreparedStatement websiteStmt = conn.prepareStatement(
                    "UPDATE employer SET company_name = ?, website = ? WHERE id = ?")) {
                websiteStmt.setString(1, companyName);
                websiteStmt.setString(2, website);
                websiteStmt.setInt(3, employerId);
                websiteStmt.executeUpdate();
            }


            rs.close();
            checkStmt.close();
            conn.close();


            return gson.toJson(result);


        } catch (Exception e) {

            e.printStackTrace();

            Map<String, Object> error =
                    new HashMap<>();

            error.put(
                    "success",
                    false
            );

            error.put(
                    "message",
                    "Error during company profile operation: "
                            + e.getMessage()
            );

            return gson.toJson(error);
        }
    };


    // Get employer profile
    public static Route getProfile = (Request request, Response response) -> {

        try {

            int employerId =
                    Integer.parseInt(
                            request.params(":employerId")
                    );


            Connection conn =
                    DbConnect.getConnection();


            /*
             * Get company name from employer table
             * and company profile information from
             * employer_profiles table.
             */
            String sql =
                    "SELECT " +
                    "e.id AS employer_id, " +
                    "e.company_name, " +
                    "e.email, " +
                    "e.phone, " +
                    "e.website, " +
                    "ep.id AS profile_id, " +
                    "ep.company_description, " +
                    "ep.company_size, " +
                    "ep.founded_year, " +
                    "ep.industry " +
                    "FROM employer e " +
                    "LEFT JOIN employer_profiles ep " +
                    "ON e.id = ep.employer_id " +
                    "WHERE e.id = ?";


            PreparedStatement pstmt =
                    conn.prepareStatement(sql);

            pstmt.setInt(
                    1,
                    employerId
            );


            ResultSet rs =
                    pstmt.executeQuery();


            Map<String, Object> result =
                    new HashMap<>();


            if (rs.next()) {

                result.put(
                        "success",
                        true
                );


                Map<String, Object> profile =
                        new HashMap<>();


                profile.put(
                        "profileId",
                        rs.getObject("profile_id")
                );

                profile.put(
                        "employerId",
                        rs.getInt("employer_id")
                );

                profile.put(
                        "companyName",
                        rs.getString("company_name")
                );

                profile.put("email", rs.getString("email"));
                profile.put("phone", rs.getString("phone"));
                profile.put("website", rs.getString("website"));

                profile.put(
                        "companyDescription",
                        rs.getString("company_description")
                );

                profile.put(
                        "companySize",
                        rs.getString("company_size")
                );

                profile.put("foundedYear", rs.getObject("founded_year"));

                profile.put(
                        "industry",
                        rs.getString("industry")
                );


                result.put(
                        "profile",
                        profile
                );

            } else {

                result.put(
                        "success",
                        false
                );

                result.put(
                        "message",
                        "Employer not found"
                );
            }


            rs.close();
            pstmt.close();
            conn.close();


            return gson.toJson(result);


        } catch (Exception e) {

            e.printStackTrace();

            Map<String, Object> error =
                    new HashMap<>();

            error.put(
                    "success",
                    false
            );

            error.put(
                    "message",
                    "Error fetching company profile: "
                            + e.getMessage()
            );

            return gson.toJson(error);
        }
    };
}
