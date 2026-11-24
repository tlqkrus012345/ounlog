package ounlog.auth.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.filter.OncePerRequestFilter;
import ounlog.auth.exception.AuthException;
import ounlog.auth.service.SessionInfo;
import ounlog.auth.service.SessionTxService;
import ounlog.common.exception.CommonErrorCode;

@Slf4j
@RequiredArgsConstructor
public class SessionGuardFilter extends OncePerRequestFilter {
    public static final String SESSION_ATTRIBUTE = SessionInfo.class.getName();
    private final SessionTxService sessions;
    private final AuthErrorWriter errors;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        if (SecurityContextHolder.getContext().getAuthentication() instanceof JwtAuthenticationToken authentication) {
            String activity = request.getHeader("X-User-Activity");
            if (java.util.Collections.list(request.getHeaders("X-User-Activity"))
                                    .size()
                            > 1
                    || (activity != null && !activity.equals("true") && !activity.equals("false"))) {
                errors.write(request, response, CommonErrorCode.INVALID_REQUEST, false);
                return;
            }
            try {
                String sid = authentication.getToken().getClaimAsString("sid");
                Long memberId = Long.valueOf(authentication.getToken().getSubject());
                SessionInfo info = "true".equals(activity)
                        ? sessions.validateAndTouch(sid, memberId)
                        : sessions.validate(sid, memberId);
                request.setAttribute(SESSION_ATTRIBUTE, info);
            } catch (AuthException exception) {
                errors.write(request, response, exception.getErrorCode(), true);
                return;
            } catch (RuntimeException exception) {
                log.error("Authentication session validation failed", exception);
                errors.write(request, response, CommonErrorCode.INTERNAL_SERVER_ERROR, false);
                return;
            }
        }
        chain.doFilter(request, response);
    }
}
