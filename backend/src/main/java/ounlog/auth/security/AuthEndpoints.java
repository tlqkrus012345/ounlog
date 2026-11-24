package ounlog.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Set;

public final class AuthEndpoints {
    private static final Set<String> MUTATIONS = Set.of("/v1/auth/login", "/v1/auth/refresh", "/v1/auth/logout");

    private AuthEndpoints() {}

    public static boolean requiresCsrf(HttpServletRequest request) {
        return "POST".equals(request.getMethod()) && MUTATIONS.contains(path(request));
    }

    public static boolean ignoresBearer(HttpServletRequest request) {
        return requiresCsrf(request) || ("GET".equals(request.getMethod()) && "/v1/auth/csrf".equals(path(request)));
    }

    public static String path(HttpServletRequest request) {
        return request.getRequestURI().substring(request.getContextPath().length());
    }
}
