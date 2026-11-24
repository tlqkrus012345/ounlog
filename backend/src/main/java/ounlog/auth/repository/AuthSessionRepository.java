package ounlog.auth.repository;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.*;
import ounlog.auth.entity.AuthSession;

public interface AuthSessionRepository extends JpaRepository<AuthSession, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from AuthSession s where s.sessionId = :sessionId")
    Optional<AuthSession> findLockedById(String sessionId);

    @Modifying
    @Query(
            value =
                    "DELETE FROM auth_session WHERE absolute_expires_at <= :now ORDER BY absolute_expires_at LIMIT :batchSize",
            nativeQuery = true)
    int deleteExpiredBatch(Instant now, int batchSize);
}
