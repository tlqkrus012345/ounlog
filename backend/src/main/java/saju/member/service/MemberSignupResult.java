package saju.member.service;

import saju.member.entity.Member;

public record MemberSignupResult(String email) {

    public static MemberSignupResult from(Member savedMember) {
        return new MemberSignupResult(savedMember.getEmail());
    }
}
