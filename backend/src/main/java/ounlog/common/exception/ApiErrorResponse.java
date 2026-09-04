package ounlog.common.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import java.util.List;

@JsonInclude(JsonInclude.Include.NON_EMPTY)
public record ApiErrorResponse(
        @Schema(description = "HTTP 상태 코드", example = "400") int status,

        @Schema(description = "클라이언트가 분기 처리할 오류 코드", example = "INVALID_REQUEST")
        String code,

        @Schema(description = "사용자에게 표시할 수 있는 오류 메시지") String message,

        @Schema(description = "오류가 발생한 API 경로", example = "/v1/members/signup")
        String path,

        @Schema(description = "필드 Validation 오류 목록") List<FieldErrorResponse> errors) {}
