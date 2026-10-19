package ounlog.saju.external.manseryeok.config;

import java.net.http.HttpClient;
import java.time.Clock;
import java.time.Duration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration(proxyBeanMethods = false)
public class ManseryeokConfig {

    @Bean
    RestClient manseryeokRestClient(
            RestClient.Builder builder,
            @Value("${saju.manseryeok.base-url:http://127.0.0.1:3001}") String baseUrl,
            @Value("${saju.manseryeok.connect-timeout:2s}") Duration connectTimeout,
            @Value("${saju.manseryeok.read-timeout:5s}") Duration readTimeout) {
        HttpClient httpClient =
                HttpClient.newBuilder().connectTimeout(connectTimeout).build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(readTimeout);
        return builder.baseUrl(baseUrl).requestFactory(factory).build();
    }

    @Bean
    Clock sajuClock() {
        return Clock.systemUTC();
    }
}
