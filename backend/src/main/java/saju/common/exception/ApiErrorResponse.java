package saju.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
        int status,
        String code,
        String message,
        String path,
        List<FieldErrorResponse> errors
) {}
