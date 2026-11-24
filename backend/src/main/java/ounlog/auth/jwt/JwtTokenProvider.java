package ounlog.auth.jwt;

import java.time.Duration;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;
import ounlog.member.entity.Role;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;
    private final JwtEncoder jwtEncoder;

    public AccessToken createAccessToken(Long memberId, Role role, String sessionId, Instant now) {
        if (!Duration.ofMinutes(15).equals(jwtProperties.accessTokenTtl())) {
            throw new IllegalStateException("The access-token contract requires a 15-minute TTL");
        }
        Instant issuedAt = now.truncatedTo(ChronoUnit.SECONDS);
        Instant expiresAt = issuedAt.plus(jwtProperties.accessTokenTtl());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(memberId.toString())
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("role", role.name())
                .claim("sid", sessionId)
                .build();

        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();

        JwtEncoderParameters parameters = JwtEncoderParameters.from(header, claims);

        return new AccessToken(jwtEncoder.encode(parameters).getTokenValue(), expiresAt);
    }

    public record AccessToken(String value, Instant expiresAt) {
        @Override
        public String toString() {
            return "AccessToken[redacted]";
        }
    }
}
