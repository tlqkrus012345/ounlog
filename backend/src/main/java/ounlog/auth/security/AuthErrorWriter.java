package ounlog.auth.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.time.Clock;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import ounlog.common.exception.ApiErrorResponse;
import ounlog.common.exception.ErrorCode;
import tools.jackson.databind.ObjectMapper;

@RequiredArgsConstructor
@Slf4j
public class AuthErrorWriter {
    private final ObjectMapper mapper;
    private final Clock clock;

    public void write(HttpServletRequest request, HttpServletResponse response, ErrorCode error, boolean bearer)
            throws IOException {
        response.setStatus(error.getStatus().value());
        log.info("Authentication request rejected: code={}", error.getCode());
        response.setHeader(HttpHeaders.CACHE_CONTROL, "no-store");
        if (bearer && error.getStatus().value() == 401) {
            response.setHeader(HttpHeaders.WWW_AUTHENTICATE, "Bearer");
        }
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.setCharacterEncoding("UTF-8");
        mapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(error, request.getRequestURI(), List.of(), clock.instant()));
    }
}
