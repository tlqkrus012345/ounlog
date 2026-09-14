package ounlog.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.Authentication;
import ounlog.auth.exception.AuthException;
import ounlog.auth.jwt.JwtTokenProvider;
import ounlog.auth.security.AuthenticatedMember;
import ounlog.auth.service.AuthenticationService;
import ounlog.auth.service.LoginCommand;
import ounlog.auth.service.LoginResult;
import ounlog.member.entity.Role;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {

    @InjectMocks
    AuthenticationService authenticationService;

    @Mock
    AuthenticationManager authenticationManager;

    @Mock
    JwtTokenProvider jwtTokenProvider;

    @DisplayName("로그인 성공 시 Access Token을 발급한다.")
    @Test
    void login() {
        // given
        LoginCommand command = new LoginCommand("test@email.com", "password");
        AuthenticatedMember member = new AuthenticatedMember(1L, "test@email.com", "password", Role.MEMBER);
        Authentication authentication = mock(Authentication.class);
        given(authenticationManager.authenticate(any(Authentication.class))).willReturn(authentication);

        given(authentication.getPrincipal()).willReturn(member);

        given(jwtTokenProvider.createAccessToken(1L, Role.MEMBER)).willReturn("access-token");
        // when
        LoginResult result = authenticationService.login(command);

        // then
        assertThat(result.accessToken()).isEqualTo("access-token");
    }

    @DisplayName("로그인 실패 시 Access Token을 발급하지 않는다.")
    @Test
    void loginWithInvalidEmailAndPassword() {
        LoginCommand command = new LoginCommand("test@email.com", "wrong-password");

        given(authenticationManager.authenticate(any(Authentication.class)))
                .willThrow(new BadCredentialsException("invalid credentials"));

        // when & then
        assertThatThrownBy(() -> authenticationService.login(command)).isInstanceOf(AuthException.class);

        then(jwtTokenProvider).shouldHaveNoInteractions();
    }
}
