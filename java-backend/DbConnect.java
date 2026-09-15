import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

public class DbConnect {

    private static final String URL =
            "jdbc:mysql://127.0.0.1:3306/hirebase?useSSL=false&serverTimezone=UTC&allowPublicKeyRetrieval=true";

    private static final String USERNAME = "root";
    private static final String PASSWORD = "Aditi@123";

    public static Connection getConnection() {

        try {
            Class.forName("com.mysql.cj.jdbc.Driver");

            Connection conn = DriverManager.getConnection(
                    URL,
                    USERNAME,
                    PASSWORD
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