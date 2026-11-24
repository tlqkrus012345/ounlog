package ounlog.auth.jwt;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

@RequiredArgsConstructor
public class SessionJwtValidator implements OAuth2TokenValidator<Jwt> {
    public static final String EXPIRED = "ounlog_access_token_expired";
    private final Clock clock;

    @Override
    public OAuth2TokenValidatorResult validate(Jwt jwt) {
        try {
            String sub = jwt.getSubject();
            String sid = jwt.getClaimAsString("sid");
            Instant issuedAt = jwt.getIssuedAt();
            Instant expiresAt = jwt.getExpiresAt();
            Instant now = clock.instant();
            if (!(jwt.getClaims().get("sub") instanceof String)
                    || sub == null
                    || !sub.matches("[1-9][0-9]*")
                    || Long.parseLong(sub) <= 0
                    || sid == null
                    || !UUID.fromString(sid).toString().equals(sid)
                    || !"MEMBER".equals(jwt.getClaimAsString("role"))
                    || issuedAt == null
                    || expiresAt == null
                    || issuedAt.isAfter(now)
                    || !expiresAt.isAfter(issuedAt)) {
                return invalid();
            }
            if (!now.isBefore(expiresAt)) {
                return OAuth2TokenValidatorResult.failure(new OAuth2Error(EXPIRED, "Access token expired", null));
            }
            return OAuth2TokenValidatorResult.success();
        } catch (IllegalArgumentException exception) {
            return invalid();
        }
    }

    private OAuth2TokenValidatorResult invalid() {
        return OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Invalid token claims", null));
    }
}
