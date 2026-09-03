package saju;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.context.annotation.Import;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.mysql.MySQLContainer;
import saju.config.MysqlTestContainerConfig;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
class SajuApplicationTests {

    @Test
    void contextLoads() {
    }

}
