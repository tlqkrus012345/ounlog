package ounlog.auth.service;

import ounlog.auth.exception.AuthErrorCode;

public record AuthAttempt(LoginResult tokens, AuthErrorCode rejection) {
    public static AuthAttempt accepted(LoginResult tokens) {
        return new AuthAttempt(tokens, null);
    }

    public static AuthAttempt rejected(AuthErrorCode rejection) {
        return new AuthAttempt(null, rejection);
    }
}
