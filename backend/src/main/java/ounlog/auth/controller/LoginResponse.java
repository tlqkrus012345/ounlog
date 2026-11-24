package ounlog.auth.controller;

import java.time.Instant;
import ounlog.auth.service.LoginResult;
import ounlog.auth.service.SessionInfo;

public record LoginResponse(String accessToken, String tokenType, Instant accessTokenExpiresAt, SessionInfo session) {

    public static LoginResponse from(LoginResult result) {
        return new LoginResponse(result.accessToken(), "Bearer", result.accessTokenExpiresAt(), result.session());
    }

    @Override
    public String toString() {
        return "LoginResponse[redacted]";
    }
}
