package ounlog.auth.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.exception.AuthException;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.member.repository.MemberRepository;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(propagation = Propagation.NEVER)
public class AuthenticationService {
    private final MemberRepository members;
    private final AuthenticationManager authenticationManager;
    private final LoginTxService loginTx;
    private final SessionTxService sessionTx;
    private final AuthRefreshTokenRepository refreshTokens;
    private final RefreshTokens tokens;

    public LoginResult login(LoginCommand command) {
        Long memberId = members.findMemberIdByEmail(command.email()).orElse(null);
        if (memberId == null) {
            try {
                authenticationManager.authenticate(
                        UsernamePasswordAuthenticationToken.unauthenticated(command.email(), command.password()));
            } catch (BadCredentialsException ignored) {
                throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
            }
            throw new AuthException(AuthErrorCode.INVALID_CREDENTIALS);
        }
        LoginResult result = unwrap(loginTx.attempt(memberId, command));
        log.info("Authentication operation completed: operation=login");
        return result;
    }

    public LoginResult refresh(String raw) {
        if (raw == null || raw.isEmpty()) {
            throw new AuthException(AuthErrorCode.AUTHENTICATION_REQUIRED);
        }
        if (!tokens.isWellFormed(raw)) {
            throw new AuthException(AuthErrorCode.SESSION_INVALID);
        }
        byte[] hash = tokens.hash(raw);
        String sessionId = refreshTokens
                .findSessionIdByHash(hash)
                .orElseThrow(() -> new AuthException(AuthErrorCode.SESSION_INVALID));
        LoginResult result = unwrap(sessionTx.refresh(sessionId, hash));
        log.info("Authentication operation completed: operation=refresh");
        return result;
    }

    public void logout(String raw) {
        if (tokens.isWellFormed(raw)) {
            refreshTokens.findSessionIdByHash(tokens.hash(raw)).ifPresent(sessionTx::logout);
        }
        log.info("Authentication operation completed: operation=logout");
    }

    private LoginResult unwrap(AuthAttempt result) {
        if (result.rejection() != null) {
            throw new AuthException(result.rejection());
        }
        return result.tokens();
    }
}
