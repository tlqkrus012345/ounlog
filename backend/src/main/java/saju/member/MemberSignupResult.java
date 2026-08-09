package saju.member;

public record MemberSignupResult(String email) {

    public static MemberSignupResult from(Member savedMember) {
        return new MemberSignupResult(savedMember.getEmail());
    }
}
