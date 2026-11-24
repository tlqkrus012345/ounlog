package ounlog.auth.service;

import java.time.Instant;
import ounlog.auth.entity.AuthSession;

public record SessionInfo(String memberId, Instant sessionExpiresAt, Instant absoluteExpiresAt) {
    public static SessionInfo from(AuthSession session) {
        return new SessionInfo(session.getMemberId().toString(), session.expiresAt(), session.getAbsoluteExpiresAt());
    }
}
