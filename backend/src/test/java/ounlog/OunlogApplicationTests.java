package ounlog;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import ounlog.config.MysqlTestContainerConfig;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
class OunlogApplicationTests {

    @Test
    void contextLoads() {
    }

}
