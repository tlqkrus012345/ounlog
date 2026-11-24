package ounlog.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.*;

import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.exception.AuthException;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.auth.service.*;
import ounlog.member.repository.MemberRepository;

@ExtendWith(MockitoExtension.class)
class AuthenticationServiceTest {
    @InjectMocks
    AuthenticationService service;

    @Mock
    MemberRepository members;

    @Mock
    AuthenticationManager authenticationManager;

    @Mock
    LoginTxService loginTx;

    @Mock
    SessionTxService sessionTx;

    @Mock
    AuthRefreshTokenRepository refreshTokens;

    @Mock
    RefreshTokens tokens;

    @Test
    void loginReturnsCommittedSuccess() {
        var command = new LoginCommand("test@email.com", "password");
        var result = new LoginResult("access", Instant.parse("2026-11-24T00:15:00Z"), "refresh", null);
        given(members.findMemberIdByEmail(command.email())).willReturn(Optional.of(1L));
        given(loginTx.attempt(1L, command)).willReturn(AuthAttempt.accepted(result));
        assertThat(service.login(command)).isSameAs(result);
    }

    @Test
    void expectedRejectionBecomesExceptionAfterTransactionReturns() {
        var command = new LoginCommand("test@email.com", "wrong-password");
        given(members.findMemberIdByEmail(command.email())).willReturn(Optional.of(1L));
        given(loginTx.attempt(1L, command)).willReturn(AuthAttempt.rejected(AuthErrorCode.INVALID_CREDENTIALS));
        assertThatThrownBy(() -> service.login(command)).isInstanceOf(AuthException.class);
        then(loginTx).should().attempt(1L, command);
    }

    @Test
    void unknownAccountStillPerformsProviderDummyPasswordCheck() {
        var command = new LoginCommand("missing@email.com", "password");
        given(members.findMemberIdByEmail(command.email())).willReturn(Optional.empty());
        given(authenticationManager.authenticate(any())).willThrow(new BadCredentialsException("rejected"));
        assertThatThrownBy(() -> service.login(command)).isInstanceOf(AuthException.class);
        then(authenticationManager).should().authenticate(any());
        then(loginTx).shouldHaveNoInteractions();
    }
}
