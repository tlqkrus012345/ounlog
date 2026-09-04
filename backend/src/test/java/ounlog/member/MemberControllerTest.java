package ounlog.member;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.member.controller.MemberController;
import ounlog.member.exception.MemberErrorCode;
import ounlog.member.exception.MemberException;
import ounlog.member.service.MemberService;
import ounlog.member.service.MemberSignupCommand;
import ounlog.member.service.MemberSignupResult;

@WebMvcTest(MemberController.class)
class MemberControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    MemberService memberService;

    @DisplayName("유효한 요청이면 회원가입 후 201 응답을 반환한다.")
    @Test
    void signup() throws Exception {
        MemberSignupCommand command = new MemberSignupCommand("test@email.com", "password123!");
        given(memberService.signup(command)).willReturn(new MemberSignupResult("test@email.com"));

        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "test@email.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value("test@email.com"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        then(memberService).should().signup(command);
    }

    @DisplayName("이메일이 비어있으면 400 응답을 반환한다.")
    @Test
    void signupWithBlankEmail() throws Exception {
        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("요청 값이 올바르지 않습니다."))
                .andExpect(jsonPath("$.path").value("/v1/members/signup"))
                .andExpect(jsonPath("$.errors[0].field").value("email"))
                .andExpect(jsonPath("$.errors[0].code").value("NotBlank"))
                .andExpect(jsonPath("$.errors[0].message").value("이메일은 필수입니다."));

        then(memberService).shouldHaveNoInteractions();
    }

    @DisplayName("이메일 형식이 올바르지 않으면 400 응답을 반환한다.")
    @Test
    void signupWithInvalidEmail() throws Exception {
        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "invalid-email",
                                  "password": "password"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("INVALID_REQUEST"))
                .andExpect(jsonPath("$.message").value("요청 값이 올바르지 않습니다."))
                .andExpect(jsonPath("$.path").value("/v1/members/signup"))
                .andExpect(jsonPath("$.errors[0].field").value("email"))
                .andExpect(jsonPath("$.errors[0].code").value("Email"))
                .andExpect(jsonPath("$.errors[0].message").value("올바른 이메일 형식이어야 합니다."));

        then(memberService).shouldHaveNoInteractions();
    }

    @DisplayName("이미 가입된 이메일이면 409 오류 응답을 반환한다.")
    @Test
    void signupWithDuplicatedEmail() throws Exception {
        MemberSignupCommand command = new MemberSignupCommand("test@email.com", "password123!");
        given(memberService.signup(command)).willThrow(new MemberException(MemberErrorCode.MEMBER_EMAIL_DUPLICATED));

        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "test@email.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isConflict())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.code").value("MEMBER_EMAIL_DUPLICATED"))
                .andExpect(jsonPath("$.message").value("이미 가입된 이메일입니다."))
                .andExpect(jsonPath("$.path").value("/v1/members/signup"))
                .andExpect(jsonPath("$.errors").doesNotExist());

        then(memberService).should().signup(command);
    }

    @DisplayName("예상하지 못한 예외가 발생하면 내부 정보 없이 500 오류 응답을 반환한다.")
    @Test
    void signupWithUnexpectedException() throws Exception {
        MemberSignupCommand command = new MemberSignupCommand("test@email.com", "password123!");
        given(memberService.signup(command)).willThrow(new IllegalStateException("sensitive internal message"));

        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "test@email.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isInternalServerError())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.code").value("INTERNAL_SERVER_ERROR"))
                .andExpect(jsonPath("$.message").value("서버 오류가 발생했습니다."))
                .andExpect(jsonPath("$.path").value("/v1/members/signup"))
                .andExpect(jsonPath("$.errors").doesNotExist())
                .andExpect(content().string(not(containsString("sensitive internal message"))));

        then(memberService).should().signup(command);
    }
}
