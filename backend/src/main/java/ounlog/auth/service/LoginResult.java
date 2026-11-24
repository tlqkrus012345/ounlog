package ounlog.auth.service;

import java.time.Instant;

public record LoginResult(String accessToken, Instant accessTokenExpiresAt, String refreshToken, SessionInfo session) {
    @Override
    public String toString() {
        return "LoginResult[redacted]";
    }
}
