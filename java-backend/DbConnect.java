import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DbConnect {

    private static final String URL = System.getenv().getOrDefault(
            "HIREBASE_DB_URL",
            "jdbc:mysql://127.0.0.1:3306/hirirebase?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
    );
    private static final String USERNAME = System.getenv().getOrDefault("HIREBASE_DB_USERNAME", "root");

    public static Connection getConnection() throws SQLException {

        try {
            String password = System.getenv("HIREBASE_DB_PASSWORD");
            if (password == null) {
                throw new SQLException(
                        "Set the HIREBASE_DB_PASSWORD environment variable before starting the Java API.");
            }

            Class.forName("com.mysql.cj.jdbc.Driver");

            return DriverManager.getConnection(
                    URL,
                    USERNAME,
                    password
            );

        } catch (ClassNotFoundException e) {
            throw new SQLException("MySQL JDBC Driver not found.", e);
        }
    }
}
