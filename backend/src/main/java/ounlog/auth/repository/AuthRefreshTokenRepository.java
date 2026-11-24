package ounlog.auth.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import ounlog.auth.entity.AuthRefreshToken;

public interface AuthRefreshTokenRepository extends JpaRepository<AuthRefreshToken, byte[]> {
    @Query("select t.sessionId from AuthRefreshToken t where t.tokenHash = :hash")
    Optional<String> findSessionIdByHash(byte[] hash);
}
