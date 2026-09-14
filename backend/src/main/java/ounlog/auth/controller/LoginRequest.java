package ounlog.auth.controller;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import ounlog.auth.service.LoginCommand;

public record LoginRequest(
        @NotBlank @Email String email, @NotBlank String password) {

    public LoginCommand toCommand() {
        return new LoginCommand(email, password);
    }
}
