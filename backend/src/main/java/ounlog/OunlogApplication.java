package ounlog;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

@ConfigurationPropertiesScan
@SpringBootApplication
public class OunlogApplication {

    public static void main(String[] args) {
        SpringApplication.run(OunlogApplication.class, args);
    }
}
