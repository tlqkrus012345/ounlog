package ounlog.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.auth.controller.AuthController;
import ounlog.auth.service.AuthenticationService;
import ounlog.auth.service.LoginResult;

@WebMvcTest(AuthController.class)
class AuthControllerTest {

    @Autowired
    MockMvc mockMvc;

    @MockitoBean
    AuthenticationService authenticationService;

    @DisplayName("정상적인 로그인 요청 시 올바른 응답을 리턴한다.")
    @Test
    void login() throws Exception {
        given(authenticationService.login(any())).willReturn(new LoginResult("access-token"));

        mockMvc.perform(post("/v1/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "user@test.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"));
    }
}
