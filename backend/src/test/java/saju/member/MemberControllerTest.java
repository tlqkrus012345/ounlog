package saju.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import saju.member.controller.MemberController;
import saju.member.service.MemberService;
import saju.member.service.MemberSignupCommand;
import saju.member.service.MemberSignupResult;

import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MemberController.class)
class MemberControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    MemberService memberService;

    @DisplayName("유효한 요청이면 회원가입 후 201 응답을 반환한다.")
    @Test
    void signup() throws Exception {
        MemberSignupCommand command =
                new MemberSignupCommand("member@example.com", "password123!");
        given(memberService.signup(command))
                .willReturn(new MemberSignupResult("member@example.com"));

        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "member@example.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.email").value("member@example.com"))
                .andExpect(jsonPath("$.password").doesNotExist())
                .andExpect(jsonPath("$.passwordHash").doesNotExist());

        then(memberService).should().signup(command);
    }

    @DisplayName("이메일 형식이 올바르지 않으면 400 응답을 반환한다.")
    @Test
    void signupWithInvalidEmail() throws Exception {
        assertBadRequest("""
                {
                  "email": "invalid-email",
                  "password": "password123!"
                }
                """);
    }

    @DisplayName("이메일이 비어 있으면 400 응답을 반환한다.")
    @Test
    void signupWithBlankEmail() throws Exception {
        assertBadRequest("""
                {
                  "email": " ",
                  "password": "password123!"
                }
                """);
    }

    @DisplayName("비밀번호가 비어 있으면 400 응답을 반환한다.")
    @Test
    void signupWithBlankPassword() throws Exception {
        assertBadRequest("""
                {
                  "email": "member@example.com",
                  "password": " "
                }
                """);
    }

    @DisplayName("요청 본문이 잘못된 JSON이면 400 응답을 반환한다.")
    @Test
    void signupWithMalformedJson() throws Exception {
        assertBadRequest("""
                {
                  "email": "member@example.com",
                }
                """);
    }

    private void assertBadRequest(String content) throws Exception {
        mockMvc.perform(post("/v1/members/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(content))
                .andExpect(status().isBadRequest());

        then(memberService).shouldHaveNoInteractions();
    }
}
