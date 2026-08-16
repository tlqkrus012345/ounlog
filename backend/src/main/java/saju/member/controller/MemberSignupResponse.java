package saju.member.controller;

import saju.member.service.MemberSignupResult;

public record MemberSignupResponse(String email) {
    public static MemberSignupResponse from(MemberSignupResult result) {
        return new MemberSignupResponse(result.email());
    }
}
