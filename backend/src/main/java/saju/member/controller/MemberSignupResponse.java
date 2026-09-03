package saju.member.controller;

import io.swagger.v3.oas.annotations.media.Schema;
import saju.member.service.MemberSignupResult;

public record MemberSignupResponse(
        @Schema(
                description = "가입된 회원 이메일",
                example = "test@email.com"
        )
        String email) {
    public static MemberSignupResponse from(MemberSignupResult result) {
        return new MemberSignupResponse(result.email());
    }
}
