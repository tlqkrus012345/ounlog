package ounlog.saju.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import ounlog.common.exception.ApiErrorResponse;

public interface SajuApi {

    @Operation(summary = "사주 Preview 분석", description = "생년월일 및 출생시간 정보를 기반으로 Preview 사주 분석을 제공합니다.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "Preview 분석 성공",
                content = @Content(schema = @Schema(implementation = SajuPreviewResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "요청값 검증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    ResponseEntity<SajuPreviewResponse> preview(SajuPreviewRequest request);
}
