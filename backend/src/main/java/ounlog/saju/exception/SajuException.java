package ounlog.saju.exception;

import ounlog.common.exception.BusinessException;

public class SajuException extends BusinessException {

    public SajuException(SajuErrorCode errorCode) {
        super(errorCode);
    }

    public SajuException(SajuErrorCode errorCode, Throwable cause) {
        super(errorCode);
        initCause(cause);
    }
}
