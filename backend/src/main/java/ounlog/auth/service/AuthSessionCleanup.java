package ounlog.auth.service;

import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.auth.repository.AuthSessionRepository;

@Service
@ConditionalOnProperty(name = "auth.cleanup.enabled", havingValue = "true")
public class AuthSessionCleanup {
    private final AuthSessionRepository sessions;
    private final Clock clock;
    private final int batchSize;

    public AuthSessionCleanup(
            AuthSessionRepository sessions, Clock clock, @Value("${auth.cleanup.batch-size}") int batchSize) {
        if (batchSize < 1) {
            throw new IllegalArgumentException("auth.cleanup.batch-size must be positive");
        }
        this.sessions = sessions;
        this.clock = clock;
        this.batchSize = batchSize;
    }

    @Scheduled(cron = "${auth.cleanup.cron}", zone = "UTC")
    @Transactional
    public void cleanup() {
        sessions.deleteExpiredBatch(clock.instant(), batchSize);
    }
}
