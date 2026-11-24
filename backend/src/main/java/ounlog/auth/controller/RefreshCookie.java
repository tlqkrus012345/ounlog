package ounlog.auth.controller;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RefreshCookie {
    public static final String NAME = "ounlog_refresh";
    private final Clock clock;

    public String issued(String token, Instant absoluteExpiry) {
        long remaining =
                Math.max(0, Duration.between(clock.instant(), absoluteExpiry).getSeconds());
        return cookie(token).maxAge(remaining).build().toString();
    }

    public String cleared() {
        return cookie("").maxAge(0).build().toString();
    }

    private ResponseCookie.ResponseCookieBuilder cookie(String value) {
        return ResponseCookie.from(NAME, value)
                .path("/v1/auth")
                .secure(true)
                .httpOnly(true)
                .sameSite("Lax");
    }
}
