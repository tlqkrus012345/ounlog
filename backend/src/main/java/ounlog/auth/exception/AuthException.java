package ounlog.auth.exception;

import ounlog.common.exception.BusinessException;

public class AuthException extends BusinessException {

    public AuthException(AuthErrorCode errorCode) {
        super(errorCode);
    }
}
