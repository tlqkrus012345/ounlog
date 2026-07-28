package saju.member;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record MemberSignupRequest(
        @Email String email,
        @NotBlank String password
) {

    public MemberSignupCommand toCommand() {
        return new MemberSignupCommand(email, password);
    }
}
