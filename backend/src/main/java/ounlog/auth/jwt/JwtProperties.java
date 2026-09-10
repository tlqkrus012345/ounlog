package ounlog.auth.jwt;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.core.io.Resource;

@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        Duration accessTokenTtl,
        Resource privateKeyLocation,
        Resource publicKeyLocation) {}
