package ounlog.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.jwt.SessionJwtValidator;

@RequiredArgsConstructor
public class AuthEntryPoint implements AuthenticationEntryPoint {
    private final AuthErrorWriter errors;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response, AuthenticationException exception)
            throws IOException {
        String authorization = request.getHeader("Authorization");
        AuthErrorCode code = authorization != null && authorization.regionMatches(true, 0, "Bearer", 0, 6)
                ? AuthErrorCode.SESSION_INVALID
                : AuthErrorCode.AUTHENTICATION_REQUIRED;
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof JwtValidationException validation
                    && validation.getErrors().stream()
                            .anyMatch(error -> SessionJwtValidator.EXPIRED.equals(error.getErrorCode()))) {
                code = AuthErrorCode.ACCESS_TOKEN_EXPIRED;
                break;
            }
        }
        errors.write(request, response, code, true);
    }
}
