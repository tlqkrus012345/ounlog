package ounlog.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class AuthRefreshToken {
    @Id
    @Column(columnDefinition = "binary(32)", length = 32)
    private byte[] tokenHash;

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, updatable = false, length = 36, columnDefinition = "char(36)")
    private String sessionId;

    @Column(nullable = false, updatable = false)
    private Instant issuedAt;

    public AuthRefreshToken(byte[] tokenHash, String sessionId, Instant issuedAt) {
        this.tokenHash = tokenHash.clone();
        this.sessionId = sessionId;
        this.issuedAt = issuedAt;
    }
}
