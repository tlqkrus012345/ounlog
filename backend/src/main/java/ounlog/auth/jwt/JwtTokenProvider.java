package ounlog.auth.jwt;

import java.time.Instant;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtTokenProvider {

    private final JwtProperties jwtProperties;
    private final JwtEncoder jwtEncoder;

    public String createAccessToken(Long memberId, Role role) {
        Instant issuedAt = Instant.now();
        Instant expiresAt = issuedAt.plus(jwtProperties.accessTokenTtl());

        JwtClaimsSet claims = JwtClaimsSet.builder()
                .subject(memberId.toString())
                .issuer(jwtProperties.issuer())
                .audience(List.of(jwtProperties.audience()))
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("role", role.name())
                .build();

        JwsHeader header = JwsHeader.with(SignatureAlgorithm.RS256).build();

        JwtEncoderParameters parameters = JwtEncoderParameters.from(header, claims);

        return jwtEncoder.encode(parameters).getTokenValue();
    }
}
