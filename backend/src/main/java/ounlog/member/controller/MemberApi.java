package ounlog.member.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import org.springframework.http.ResponseEntity;
import ounlog.common.exception.ApiErrorResponse;

public interface MemberApi {

    @Operation(summary = "회원 가입", description = "이메일과 비밀번호를 통해 회원 가입.")
    @ApiResponses({
        @ApiResponse(
                responseCode = "201",
                description = "회원가입 성공",
                content = @Content(schema = @Schema(implementation = MemberSignupResponse.class))),
        @ApiResponse(
                responseCode = "400",
                description = "요청값 검증 실패",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class))),
        @ApiResponse(
                responseCode = "409",
                description = "이미 가입된 이메일",
                content = @Content(schema = @Schema(implementation = ApiErrorResponse.class)))
    })
    ResponseEntity<MemberSignupResponse> signup(MemberSignupRequest request);
}
