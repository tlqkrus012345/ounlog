package ounlog.auth.controller;

import ounlog.auth.service.LoginResult;

public record LoginResponse(String accessToken, String tokenType) {

    public static LoginResponse from(LoginResult result) {
        return new LoginResponse(result.accessToken(), "Bearer");
    }
}
