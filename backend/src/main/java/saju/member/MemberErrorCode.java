package saju.member;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import saju.common.exception.ErrorCode;

@Getter
@AllArgsConstructor
public enum MemberErrorCode implements ErrorCode {

    MEMBER_EMAIL_DUPLICATED(
            HttpStatus.CONFLICT,
            "MEMBER_EMAIL_DUPLICATED",
            "이미 가입된 이메일입니다."
    );

    private final HttpStatus status;
    private final String code;
    private final String message;
}
