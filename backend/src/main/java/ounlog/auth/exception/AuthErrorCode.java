package ounlog.auth.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import ounlog.common.exception.ErrorCode;

@Getter
@AllArgsConstructor
public enum AuthErrorCode implements ErrorCode {
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
