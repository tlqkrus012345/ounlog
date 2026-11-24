package ounlog.auth.service;

import java.time.Clock;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.auth.entity.AuthRefreshToken;
import ounlog.auth.entity.AuthSession;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.exception.AuthException;
import ounlog.auth.jwt.JwtTokenProvider;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.member.entity.Member;
import ounlog.member.entity.MemberStatus;
import ounlog.member.repository.MemberRepository;

@Service
@RequiredArgsConstructor
@Slf4j
public class SessionTxService {
    private final AuthSessionRepository sessions;
    private final AuthRefreshTokenRepository refreshTokens;
    private final MemberRepository members;
    private final RefreshTokens tokens;
    private final JwtTokenProvider jwt;
    private final Clock clock;

    @Transactional
    public AuthAttempt refresh(String sessionId, byte[] presentedHash) {
        AuthSession session = sessions.findLockedById(sessionId).orElse(null);
        Instant now = now();
        AuthErrorCode rejection = rejection(session, now);
        if (rejection != null) {
            return AuthAttempt.rejected(rejection);
        }
        if (!session.matchesRefreshHash(presentedHash)) {
            log.warn("Refresh token reuse detected");
            session.revoke(now);
            return AuthAttempt.rejected(AuthErrorCode.SESSION_INVALID);
        }
        String raw = tokens.generate();
        byte[] hash = tokens.hash(raw);
        refreshTokens.save(new AuthRefreshToken(hash, sessionId, now));
        session.rotateRefreshHash(hash);
        Member member = members.findById(session.getMemberId()).orElseThrow();
        var access = jwt.createAccessToken(member.getMemberId(), member.getRole(), sessionId, now);
        return AuthAttempt.accepted(
                new LoginResult(access.value(), access.expiresAt(), raw, SessionInfo.from(session)));
    }

    @Transactional
    public void logout(String sessionId) {
        sessions.findLockedById(sessionId).ifPresent(session -> session.revoke(now()));
    }

    @Transactional(readOnly = true)
    public SessionInfo validate(String sessionId, Long memberId) {
        return validated(sessions.findById(sessionId).orElse(null), memberId, false);
    }

    @Transactional
    public SessionInfo validateAndTouch(String sessionId, Long memberId) {
        return validated(sessions.findLockedById(sessionId).orElse(null), memberId, true);
    }

    private SessionInfo validated(AuthSession session, Long memberId, boolean activity) {
        Instant now = now();
        if (session == null || !session.getMemberId().equals(memberId)) {
            throw new AuthException(AuthErrorCode.SESSION_INVALID);
        }
        AuthErrorCode rejection = rejection(session, now);
        if (rejection != null) {
            throw new AuthException(rejection);
        }
        if (activity) {
            session.recordActivity(now);
        }
        return SessionInfo.from(session);
    }

    private AuthErrorCode rejection(AuthSession session, Instant now) {
        if (session == null || session.getRevokedAt() != null) {
            return AuthErrorCode.SESSION_INVALID;
        }
        if (session.isExpired(now)) {
            return AuthErrorCode.SESSION_EXPIRED;
        }
        return members.findById(session.getMemberId())
                        .filter(member -> member.getStatus() == MemberStatus.ACTIVE)
                        .isPresent()
                ? null
                : AuthErrorCode.SESSION_INVALID;
    }

    private Instant now() {
        return clock.instant().truncatedTo(ChronoUnit.MICROS);
    }
}
