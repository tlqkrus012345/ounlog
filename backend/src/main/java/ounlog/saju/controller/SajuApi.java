package ounlog.saju.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.jwt.Jwt;
import ounlog.common.exception.ApiErrorResponse;
import ounlog.saju.controller.request.SajuAnalysisRequest;
import ounlog.saju.controller.request.SajuPreviewRequest;
import ounlog.saju.controller.response.SajuAnalysisResponse;
import ounlog.saju.controller.response.SajuPreviewResponse;

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

    @Operation(summary = "사주 전체 분석", description = "생년월일 및 출생시간 정보를 기반으로 사주 분석을 제공합니다.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "사주 분석 결과 생성 성공",
                content = @Content(schema = @Schema(implementation = SajuAnalysisResponse.class))),
        @ApiResponse(
                responseCode = "200",
                description = "기존 사주 분석 결과 반환",
                content = @Content(schema = @Schema(implementation = SajuAnalysisResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "요청값 검증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "인증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    ResponseEntity<SajuAnalysisResponse> sajuAnalysis(Jwt jwt, SajuAnalysisRequest request);

    @Operation(summary = "사주 분석 결과 조회", description = "로그인한 회원의 사주 분석 결과를 조회합니다.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "사주 분석 결과 조회 성공",
                content = @Content(schema = @Schema(implementation = SajuAnalysisResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "인증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "404",
                description = "사주 분석 결과 없음",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    ResponseEntity<SajuAnalysisResponse> getSajuAnalysis(Jwt jwt);
}
