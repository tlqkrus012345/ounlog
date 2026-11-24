package ounlog.auth.exception;

import java.util.List;
import lombok.Getter;
import ounlog.common.exception.BusinessException;
import ounlog.common.exception.CommonErrorCode;
import ounlog.common.exception.FieldErrorResponse;

@Getter
public class LoginValidationException extends BusinessException {
    private final List<FieldErrorResponse> errors;

    public LoginValidationException(List<FieldErrorResponse> errors) {
        super(CommonErrorCode.INVALID_REQUEST);
        this.errors = List.copyOf(errors);
    }
}
