package ounlog.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.auth.entity.AuthRefreshToken;
import ounlog.auth.entity.AuthSession;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.jwt.JwtTokenProvider;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.member.entity.Member;
import ounlog.member.entity.MemberStatus;
import ounlog.member.repository.MemberRepository;

@Service
@RequiredArgsConstructor
public class LoginTxService {
    private final MemberRepository members;
    private final AuthSessionRepository sessions;
    private final AuthRefreshTokenRepository refreshTokens;
    private final AuthenticationManager authenticationManager;
    private final RefreshTokens tokens;
    private final JwtTokenProvider jwt;
    private final Clock clock;

    @Transactional
    public AuthAttempt attempt(Long memberId, LoginCommand command) {
        Member member = members.findLockedById(memberId).orElse(null);
        Instant now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        if (member == null || member.getStatus() != MemberStatus.ACTIVE || member.isLoginLocked(now)) {
            return AuthAttempt.rejected(AuthErrorCode.INVALID_CREDENTIALS);
        }
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(member.getEmail(), command.password()));
        } catch (BadCredentialsException exception) {
            member.recordLoginFailure(clock.instant().truncatedTo(ChronoUnit.MICROS));
            return AuthAttempt.rejected(AuthErrorCode.INVALID_CREDENTIALS);
        }
        member.resetLoginFailures();
        now = clock.instant().truncatedTo(ChronoUnit.MICROS);
        String refreshToken = tokens.generate();
        byte[] hash = tokens.hash(refreshToken);
        AuthSession session = new AuthSession(memberId, now, hash);
        sessions.save(session);
        refreshTokens.save(new AuthRefreshToken(hash, session.getSessionId(), now));
        var access = jwt.createAccessToken(memberId, member.getRole(), session.getSessionId(), now);
        return AuthAttempt.accepted(
                new LoginResult(access.value(), access.expiresAt(), refreshToken, SessionInfo.from(session)));
    }
}
