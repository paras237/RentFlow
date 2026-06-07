import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class DbCheck {
    public static void main(String[] args) {
        try {
            Connection conn = DriverManager.getConnection("jdbc:postgresql://localhost:5432/rental_db", "postgres", "postgres");
            Statement stmt = conn.createStatement();
            ResultSet rs = stmt.executeQuery("SELECT count(*) FROM recurring_charges");
            if (rs.next()) {
                System.out.println("Total recurring_charges: " + rs.getInt(1));
            }
            ResultSet rs2 = stmt.executeQuery("SELECT * FROM recurring_charges");
            while (rs2.next()) {
                System.out.println("ID: " + rs2.getInt("id") + ", Lease: " + rs2.getInt("lease_id") + ", Desc: " + rs2.getString("description") + ", Amt: " + rs2.getDouble("amount"));
            }
            conn.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
