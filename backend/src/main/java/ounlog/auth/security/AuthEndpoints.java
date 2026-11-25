package ounlog.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpMethod;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;
import org.springframework.security.web.util.matcher.OrRequestMatcher;
import org.springframework.security.web.util.matcher.RequestMatcher;

public final class AuthEndpoints {
    private static final RequestMatcher MUTATIONS = new OrRequestMatcher(
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/v1/auth/login"),
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/v1/auth/refresh"),
            PathPatternRequestMatcher.pathPattern(HttpMethod.POST, "/v1/auth/logout"));
    private static final RequestMatcher CSRF_READ =
            PathPatternRequestMatcher.pathPattern(HttpMethod.GET, "/v1/auth/csrf");
    private static final RequestMatcher AUTH = PathPatternRequestMatcher.pathPattern("/v1/auth/**");

    private AuthEndpoints() {}

    public static boolean requiresCsrf(HttpServletRequest request) {
        return MUTATIONS.matches(request);
    }

    public static boolean ignoresBearer(HttpServletRequest request) {
        return MUTATIONS.matches(request) || CSRF_READ.matches(request);
    }

    public static boolean isAuthRequest(HttpServletRequest request) {
        return AUTH.matches(request);
    }
}
