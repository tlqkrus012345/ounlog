package ounlog.auth.controller;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.CookieValue;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import ounlog.auth.security.SessionGuardFilter;
import ounlog.auth.service.AuthenticationService;
import ounlog.auth.service.LoginResult;
import ounlog.auth.service.SessionInfo;

@RestController
@RequestMapping("/v1/auth")
@RequiredArgsConstructor
public class AuthController implements AuthApi {

    private final AuthenticationService authenticationService;
    private final RefreshCookie refreshCookie;
    private final CookieCsrfTokenRepository csrfTokens;
    private final Validator validator;

    @Override
    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response) {
        LoginResult result = authenticationService.login(request.toCommand(validator));
        csrfTokens.saveToken(null, servletRequest, response);
        return tokenResponse(result);
    }

    @Override
    @PostMapping("/refresh")
    public ResponseEntity<LoginResponse> refresh(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken) {
        return tokenResponse(authenticationService.refresh(refreshToken));
    }

    @Override
    @GetMapping("/session")
    public SessionInfo session(HttpServletRequest request) {
        return (SessionInfo) request.getAttribute(SessionGuardFilter.SESSION_ATTRIBUTE);
    }

    @Override
    @PostMapping("/logout")
    public ResponseEntity<Void> logout(
            @CookieValue(name = RefreshCookie.NAME, required = false) String refreshToken,
            HttpServletRequest request,
            HttpServletResponse response) {
        authenticationService.logout(refreshToken);
        csrfTokens.saveToken(null, request, response);
        return ResponseEntity.noContent()
                .header(HttpHeaders.SET_COOKIE, refreshCookie.cleared())
                .build();
    }

    @Override
    @GetMapping("/csrf")
    public CsrfResponse csrf(HttpServletRequest request) {
        CsrfToken token = (CsrfToken) request.getAttribute(CsrfToken.class.getName());
        return new CsrfResponse(token.getToken());
    }

    private ResponseEntity<LoginResponse> tokenResponse(LoginResult result) {
        return ResponseEntity.ok()
                .header(
                        HttpHeaders.SET_COOKIE,
                        refreshCookie.issued(
                                result.refreshToken(), result.session().absoluteExpiresAt()))
                .body(LoginResponse.from(result));
    }

    public record CsrfResponse(String csrfToken) {
        @Override
        public String toString() {
            return "CsrfResponse[redacted]";
        }
    }
}
