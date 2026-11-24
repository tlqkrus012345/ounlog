package ounlog.auth.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import ounlog.auth.service.SessionInfo;
import ounlog.common.exception.ApiErrorResponse;

public interface AuthApi {

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 인증하고 Bearer Access Token을 발급합니다.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "200",
                description = "로그인 성공",
                content = @Content(schema = @Schema(implementation = LoginResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "요청값 검증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "401",
                description = "이메일 또는 비밀번호 불일치",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    ResponseEntity<LoginResponse> login(
            LoginRequest request, HttpServletRequest servletRequest, HttpServletResponse response);

    @Operation(
            operationId = "refreshAccessToken",
            summary = "Access Token 재발급",
            description = "Refresh Cookie를 교체합니다. 활동 시간은 연장하지 않습니다.")
    ResponseEntity<LoginResponse> refresh(String refreshToken);

    @Operation(operationId = "getCurrentSession", summary = "현재 로그인 정보 조회")
    SessionInfo session(HttpServletRequest request);

    @Operation(operationId = "logout", summary = "현재 세션 로그아웃")
    ResponseEntity<Void> logout(String refreshToken, HttpServletRequest request, HttpServletResponse response);

    @Operation(operationId = "getCsrfToken", summary = "CSRF Token 조회")
    AuthController.CsrfResponse csrf(HttpServletRequest request);
}
