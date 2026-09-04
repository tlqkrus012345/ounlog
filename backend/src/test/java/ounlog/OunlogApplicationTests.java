package ounlog;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import ounlog.config.MysqlTestContainerConfig;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
class OunlogApplicationTests {

    @Test
    void contextLoads() {}
}
