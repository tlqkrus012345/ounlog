package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;

@Testcontainers
class SajuStructuredResultMigrationTest {

    @Container
    static final MySQLContainer MYSQL = new MySQLContainer("mysql:8.4.10").withDatabaseName("migration_test");

    @DisplayName("V6에 저장된 일반 문자열 결과를 V7 마이그레이션이 그대로 보존한다.")
    @Test
    void migratesExistingTextWithoutInventingStructuredData() throws Exception {
        Flyway.configure()
                .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                .target("6")
                .load()
                .migrate();

        try (Connection connection =
                        DriverManager.getConnection(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword());
                Statement statement = connection.createStatement()) {
            statement.executeUpdate("""
                    INSERT INTO saju_analysis
                        (member_id, birth_date, birth_time, calendar_type, gender, result, created_at)
                    VALUES (1, '1992-10-24', '05:30:00', 'SOLAR', 'MALE', '기존 문자열 결과', CURRENT_TIMESTAMP(6))
                    """);

            Flyway.configure()
                    .dataSource(MYSQL.getJdbcUrl(), MYSQL.getUsername(), MYSQL.getPassword())
                    .load()
                    .migrate();

            try (ResultSet rows = statement.executeQuery(
                    "SELECT result, calculation_snapshot, interpretation FROM saju_analysis WHERE member_id = 1")) {
                assertThat(rows.next()).isTrue();
                assertThat(rows.getString("result")).isEqualTo("기존 문자열 결과");
                assertThat(rows.getString("calculation_snapshot")).isNull();
                assertThat(rows.getString("interpretation")).isNull();
            }
        }
    }
}
