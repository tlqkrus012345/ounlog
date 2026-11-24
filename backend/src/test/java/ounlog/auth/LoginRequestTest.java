package ounlog.auth;

import static org.assertj.core.api.Assertions.*;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import ounlog.auth.controller.LoginRequest;
import ounlog.auth.exception.LoginValidationException;

class LoginRequestTest {
    static final jakarta.validation.ValidatorFactory FACTORY = Validation.buildDefaultValidatorFactory();
    static final Validator VALIDATOR = FACTORY.getValidator();

    @AfterAll
    static void closeFactory() {
        FACTORY.close();
    }

    @Test
    void emailTrimsSurroundingWhitespaceAndPasswordRemainsUnchanged() {
        var command = new LoginRequest(" \t\u00a0User@Example.com\n\ufeff", " password ").toCommand(VALIDATOR);
        assertThat(command.email()).isEqualTo("User@Example.com");
        assertThat(command.password()).isEqualTo(" password ");
    }

    @Test
    void acceptsEmailAt255CodePointsAndRejects256BeforeFormatValidation() {
        String atLimit = "a".repeat(64) + "@" + "a".repeat(63) + "." + "a".repeat(63) + "." + "a".repeat(62);
        assertThat(atLimit.length()).isEqualTo(255);
        assertThatCode(() -> new LoginRequest(atLimit, "pw").toCommand(VALIDATOR))
                .doesNotThrowAnyException();
        assertError(new LoginRequest(atLimit + "a", "pw"), "email", "TOO_LONG");
        assertError(new LoginRequest("😀".repeat(256), "pw"), "email", "TOO_LONG");
        var result = catchThrowableOfType(
                LoginValidationException.class, () -> new LoginRequest("😀".repeat(255), "pw").toCommand(VALIDATOR));
        assertThat(result.getErrors().getFirst().code()).isEqualTo("INVALID_FORMAT");
    }

    @Test
    void passwordHonors64CodePointsAnd72Utf8BytesWithoutTruncating() {
        assertThatCode(() -> new LoginRequest("a@b.com", "a".repeat(64)).toCommand(VALIDATOR))
                .doesNotThrowAnyException();
        assertError(new LoginRequest("a@b.com", "a".repeat(65)), "password", "TOO_LONG");
        assertThatCode(() -> new LoginRequest("a@b.com", "가".repeat(24)).toCommand(VALIDATOR))
                .doesNotThrowAnyException();
        assertError(new LoginRequest("a@b.com", "가".repeat(24) + "a"), "password", "TOO_LONG");
        assertThatCode(() -> new LoginRequest("a@b.com", "😀".repeat(18)).toCommand(VALIDATOR))
                .doesNotThrowAnyException();
        assertError(new LoginRequest("a@b.com", "😀".repeat(18) + "a"), "password", "TOO_LONG");
    }

    @Test
    void requiredTakesPrecedenceAndEachFieldHasAtMostOneError() {
        var result = catchThrowableOfType(
                LoginValidationException.class,
                () -> new LoginRequest(" ".repeat(300), " ".repeat(80)).toCommand(VALIDATOR));
        assertThat(result.getErrors()).hasSize(2).allSatisfy(error -> assertThat(error.code())
                .isEqualTo("REQUIRED"));
        assertError(new LoginRequest(null, "pw"), "email", "REQUIRED");
        assertError(new LoginRequest("a@b.com", null), "password", "REQUIRED");
        assertError(new LoginRequest("a@b.com", "\u00a0\ufeff"), "password", "REQUIRED");
    }

    private void assertError(LoginRequest request, String field, String code) {
        var error = catchThrowableOfType(LoginValidationException.class, () -> request.toCommand(VALIDATOR));
        assertThat(error.getErrors()).hasSize(1);
        assertThat(error.getErrors().getFirst().field()).isEqualTo(field);
        assertThat(error.getErrors().getFirst().code()).isEqualTo(code);
    }
}
