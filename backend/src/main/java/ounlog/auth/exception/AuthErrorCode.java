package ounlog.auth.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import ounlog.common.exception.ErrorCode;

@Getter
@AllArgsConstructor
public enum AuthErrorCode implements ErrorCode {
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않거나 로그인이 일시적으로 제한되었습니다."),
    AUTHENTICATION_REQUIRED(HttpStatus.UNAUTHORIZED, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다."),
    ACCESS_TOKEN_EXPIRED(HttpStatus.UNAUTHORIZED, "ACCESS_TOKEN_EXPIRED", "인증 토큰이 만료되었습니다."),
    SESSION_EXPIRED(HttpStatus.UNAUTHORIZED, "SESSION_EXPIRED", "로그인 유지 시간이 만료되었습니다. 다시 로그인해 주세요."),
    SESSION_INVALID(HttpStatus.UNAUTHORIZED, "SESSION_INVALID", "유효하지 않은 로그인 정보입니다. 다시 로그인해 주세요."),
    CSRF_INVALID(HttpStatus.FORBIDDEN, "CSRF_INVALID", "요청을 확인할 수 없습니다. 다시 시도해 주세요.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
