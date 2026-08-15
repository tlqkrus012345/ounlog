package saju.common.exception;

public record FieldErrorResponse(
        String field,
        String code,
        String message
) {}
