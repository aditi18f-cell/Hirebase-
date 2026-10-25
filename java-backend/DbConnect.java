import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DbConnect {

    private static final String URL = System.getenv().getOrDefault(
            "HIREBASE_DB_URL",
            "jdbc:mysql://127.0.0.1:3306/hirebase?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true"
    );
    private static final String USERNAME = System.getenv().getOrDefault("HIREBASE_DB_USERNAME", "root");

    public static Connection getConnection() {

        try {
            String password = System.getenv("HIREBASE_DB_PASSWORD");
            if (password == null) {
                System.err.println("Set the HIREBASE_DB_PASSWORD environment variable before starting the Java API.");
                return null;
            }

            Class.forName("com.mysql.cj.jdbc.Driver");

            Connection conn = DriverManager.getConnection(
                    URL,
                    USERNAME,
                    password
            );

            return conn;

        } catch (ClassNotFoundException e) {
            System.out.println("MySQL JDBC Driver not found.");
            e.printStackTrace();
            return null;

        } catch (SQLException e) {
            System.out.println("MySQL connection failed.");
            e.printStackTrace();
            return null;
        }
    }
}
