package ounlog.member.service;

import ounlog.member.entity.Member;

public record MemberSignupResult(String email) {

    public static MemberSignupResult from(Member savedMember) {
        return new MemberSignupResult(savedMember.getEmail());
    }
}
