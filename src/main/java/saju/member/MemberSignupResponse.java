package saju.member;

public record MemberSignupResponse(String email) {
    public static MemberSignupResponse from(MemberSignupResult result) {
        return new MemberSignupResponse(result.email());
    }
}
