package ounlog.auth.controller;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import ounlog.auth.exception.LoginValidationException;
import ounlog.auth.service.LoginCommand;
import ounlog.common.exception.FieldErrorResponse;
import tools.jackson.databind.JsonNode;

public record LoginRequest(String email, String password) {

    @JsonCreator
    public static LoginRequest fromJson(
            @JsonProperty("email") JsonNode email, @JsonProperty("password") JsonNode password) {
        return new LoginRequest(stringValue(email), stringValue(password));
    }

    private static String stringValue(JsonNode value) {
        if (value == null || value.isNull()) {
            return null;
        }
        if (!value.isString()) {
            throw new IllegalArgumentException("Login fields must be strings");
        }
        return value.asString();
    }

    public LoginCommand toCommand(Validator validator) {
        String normalized = email == null ? "" : email.replaceAll("^[\\s\\p{Z}\\uFEFF]+|[\\s\\p{Z}\\uFEFF]+$", "");
        List<FieldErrorResponse> errors = new ArrayList<>();
        if (normalized.isEmpty()) {
            errors.add(new FieldErrorResponse("email", "REQUIRED", "이메일을 입력해 주세요."));
        } else if (normalized.codePointCount(0, normalized.length()) > 255) {
            errors.add(new FieldErrorResponse("email", "TOO_LONG", "이메일은 255자 이하로 입력해 주세요."));
        } else if (!validator.validate(new EmailValue(normalized)).isEmpty()) {
            errors.add(new FieldErrorResponse("email", "INVALID_FORMAT", "올바른 이메일 형식으로 입력해 주세요."));
        }
        if (password == null
                || password.codePoints()
                        .allMatch(point ->
                                Character.isWhitespace(point) || Character.isSpaceChar(point) || point == 0xFEFF)) {
            errors.add(new FieldErrorResponse("password", "REQUIRED", "비밀번호를 입력해 주세요."));
        } else if (password.codePointCount(0, password.length()) > 64
                || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            errors.add(new FieldErrorResponse("password", "TOO_LONG", "비밀번호가 너무 깁니다. 입력한 내용을 확인해 주세요."));
        }
        if (!errors.isEmpty()) {
            throw new LoginValidationException(errors);
        }
        return new LoginCommand(normalized, password);
    }

    private record EmailValue(@Email String email) {}

    @Override
    public String toString() {
        return "LoginRequest[redacted]";
    }
}
