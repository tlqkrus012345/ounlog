package ounlog.common.exception;

import jakarta.servlet.http.HttpServletRequest;
import java.time.Instant;
import java.util.List;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;
import ounlog.auth.exception.LoginValidationException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiErrorResponse> handleBusinessException(
            BusinessException exception, HttpServletRequest request) {
        log.info("Request rejected: code={}", exception.getErrorCode().getCode());
        List<FieldErrorResponse> errors =
                exception instanceof LoginValidationException validation ? validation.getErrors() : List.of();
        return response(exception.getErrorCode(), request, errors);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleMethodArgumentNotValidException(
            MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<FieldErrorResponse> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new FieldErrorResponse(error.getField(), error.getCode(), error.getDefaultMessage()))
                .toList();
        return response(CommonErrorCode.INVALID_REQUEST, request, errors);
    }

    @ExceptionHandler({HttpMessageNotReadableException.class, MethodArgumentTypeMismatchException.class})
    public ResponseEntity<ApiErrorResponse> handleInvalidRequest(Exception exception, HttpServletRequest request) {
        return response(CommonErrorCode.INVALID_REQUEST, request, List.of());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleException(Exception exception, HttpServletRequest request) {
        log.error("Unexpected exception occurred", exception);
        return response(CommonErrorCode.INTERNAL_SERVER_ERROR, request, List.of());
    }

    private ResponseEntity<ApiErrorResponse> response(
            ErrorCode error, HttpServletRequest request, List<FieldErrorResponse> errors) {
        return ResponseEntity.status(error.getStatus())
                .cacheControl(org.springframework.http.CacheControl.noStore())
                .body(ApiErrorResponse.of(error, request.getRequestURI(), errors, Instant.now()));
    }
}
