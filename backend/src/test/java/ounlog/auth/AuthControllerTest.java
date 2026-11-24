package ounlog.auth;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.Instant;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.auth.config.SecurityConfig;
import ounlog.auth.controller.AuthController;
import ounlog.auth.controller.RefreshCookie;
import ounlog.auth.service.*;
import ounlog.common.config.TimeConfig;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(AuthController.class)
@Import({SecurityConfig.class, TimeConfig.class, RefreshCookie.class})
class AuthControllerTest {
    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    @MockitoBean
    AuthenticationService authenticationService;

    @MockitoBean
    SessionTxService sessionTxService;

    @MockitoBean
    JwtDecoder jwtDecoder;

    @MockitoBean
    UserDetailsService userDetailsService;

    @MockitoBean
    PasswordEncoder passwordEncoder;

    @Test
    void loginReturnsContractAndBothCookieHeaders() throws Exception {
        Instant now = Instant.now();
        given(authenticationService.login(any()))
                .willReturn(new LoginResult(
                        "access-token",
                        now.plusSeconds(900),
                        "refresh-token",
                        new SessionInfo("1", now.plusSeconds(28800), now.plusSeconds(86400))));
        var csrf = mvc.perform(get("/v1/auth/csrf").secure(true)).andReturn().getResponse();
        mvc.perform(post("/v1/auth/login")
                        .secure(true)
                        .cookie(csrf.getCookie("__Host-ounlog_csrf"))
                        .header(
                                "X-CSRF-TOKEN",
                                mapper.readTree(csrf.getContentAsString())
                                        .get("csrfToken")
                                        .asString())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\" user@test.com \",\"password\":\" password123! \"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.accessToken").value("access-token"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessTokenExpiresAt").isString())
                .andExpect(jsonPath("$.session.memberId").value("1"))
                .andExpect(jsonPath("$.refreshToken").doesNotExist())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(cookie().maxAge("__Host-ounlog_csrf", 0))
                .andExpect(cookie().httpOnly("ounlog_refresh", true))
                .andExpect(cookie().secure("ounlog_refresh", true))
                .andExpect(cookie().path("ounlog_refresh", "/v1/auth"));
        then(authenticationService).should().login(new LoginCommand("user@test.com", " password123! "));
    }
}
