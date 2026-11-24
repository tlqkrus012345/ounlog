package ounlog.auth.entity;

import jakarta.persistence.*;
import java.security.MessageDigest;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthSession {
    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(length = 36, columnDefinition = "char(36)")
    private String sessionId;

    @Column(nullable = false, updatable = false)
    private Long memberId;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant lastActivityAt;

    @Column(nullable = false, updatable = false)
    private Instant absoluteExpiresAt;

    @Column(nullable = false, columnDefinition = "binary(32)", length = 32)
    private byte[] currentRefreshTokenHash;

    private Instant revokedAt;

    public AuthSession(Long memberId, Instant now, byte[] refreshHash) {
        this.sessionId = UUID.randomUUID().toString();
        this.memberId = memberId;
        this.createdAt = now;
        this.lastActivityAt = now;
        this.absoluteExpiresAt = now.plus(Duration.ofHours(24));
        this.currentRefreshTokenHash = refreshHash.clone();
    }

    public Instant expiresAt() {
        Instant idleExpiry = lastActivityAt.plus(Duration.ofHours(8));
        return idleExpiry.isBefore(absoluteExpiresAt) ? idleExpiry : absoluteExpiresAt;
    }

    public boolean isExpired(Instant now) {
        return !now.isBefore(expiresAt());
    }

    public boolean matchesRefreshHash(byte[] hash) {
        return MessageDigest.isEqual(currentRefreshTokenHash, hash);
    }

    public void rotateRefreshHash(byte[] hash) {
        currentRefreshTokenHash = hash.clone();
    }

    public void recordActivity(Instant now) {
        if (now.isAfter(lastActivityAt)) {
            lastActivityAt = now;
        }
    }

    public void revoke(Instant now) {
        if (revokedAt == null) {
            revokedAt = now.isBefore(createdAt) ? createdAt : now;
        }
    }
}
