package ounlog.auth;

import static org.assertj.core.api.Assertions.*;

import java.time.Instant;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.testcontainers.mysql.MySQLContainer;
import ounlog.OunlogApplication;
import ounlog.auth.exception.AuthException;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.auth.service.AuthenticationService;
import ounlog.auth.service.LoginCommand;
import ounlog.auth.service.LoginResult;
import ounlog.auth.service.SessionTxService;
import ounlog.member.entity.Member;
import ounlog.member.repository.MemberRepository;

class AuthRestartIntegrationTest {
    @Test
    void v8PreservesLegacyMembersAndSecurityStateSurvivesApplicationRestart() {
        try (var mysql = new MySQLContainer("mysql:8.4.10").withDatabaseName("ounlog")) {
            mysql.start();
            Flyway.configure()
                    .dataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword())
                    .locations("classpath:db/migration")
                    .target("7")
                    .load()
                    .migrate();
            var jdbc = new JdbcTemplate(
                    new DriverManagerDataSource(mysql.getJdbcUrl(), mysql.getUsername(), mysql.getPassword()));
            String hash = new BCryptPasswordEncoder().encode("password123!");
            jdbc.update(
                    "INSERT INTO member(email, password_hash, status, role, created_at, updated_at) VALUES(?, ?, 'ACTIVE', 'MEMBER', ?, ?)",
                    "legacy@test.com",
                    hash,
                    java.sql.Timestamp.from(Instant.now()),
                    java.sql.Timestamp.from(Instant.now()));
            LoginResult login;
            String sid;
            Long memberId;
            Instant activity;
            Instant absoluteExpiry;
            Instant lockedUntil;
            try (var first = start(mysql)) {
                var members = first.getBean(MemberRepository.class);
                var legacy = members.findByEmail("legacy@test.com").orElseThrow();
                memberId = legacy.getMemberId();
                assertThat(legacy.getPasswordHash()).isEqualTo(hash);
                assertThat(legacy.getFailedLoginCount()).isZero();
                assertThat(legacy.getLoginLockedUntil()).isNull();
                var auth = first.getBean(AuthenticationService.class);
                login = auth.login(new LoginCommand("legacy@test.com", "password123!"));
                var sessions = first.getBean(AuthSessionRepository.class);
                var session = sessions.findAll().getFirst();
                sid = session.getSessionId();
                activity = session.getLastActivityAt();
                absoluteExpiry = session.getAbsoluteExpiresAt();
                members.save(Member.signup("locked@test.com", hash));
                for (int i = 0; i < 5; i++) {
                    assertThatThrownBy(() -> auth.login(new LoginCommand("locked@test.com", "wrong")))
                            .isInstanceOf(AuthException.class);
                }
                lockedUntil =
                        members.findByEmail("locked@test.com").orElseThrow().getLoginLockedUntil();
                assertThat(first.getBean(Flyway.class)
                                .info()
                                .current()
                                .getVersion()
                                .getVersion())
                        .isEqualTo("8");
            }
            // A new Spring context, persistence context, pool and security chain against the same DB and signing keys.
            try (var second = start(mysql)) {
                var members = second.getBean(MemberRepository.class);
                var locked = members.findByEmail("locked@test.com").orElseThrow();
                assertThat(locked.getFailedLoginCount()).isEqualTo((byte) 5);
                assertThat(locked.getLoginLockedUntil()).isEqualTo(lockedUntil);
                var session = second.getBean(AuthSessionRepository.class)
                        .findById(sid)
                        .orElseThrow();
                assertThat(session.getLastActivityAt()).isEqualTo(activity);
                assertThat(session.getAbsoluteExpiresAt()).isEqualTo(absoluteExpiry);
                assertThat(second.getBean(SessionTxService.class)
                                .validate(sid, memberId)
                                .memberId())
                        .isEqualTo(memberId.toString());
                var restored = second.getBean(AuthenticationService.class).refresh(login.refreshToken());
                assertThat(restored.session().absoluteExpiresAt()).isEqualTo(absoluteExpiry);
                assertThat(restored.session().sessionExpiresAt()).isEqualTo(activity.plusSeconds(28800));
            }
        }
    }

    private ConfigurableApplicationContext start(MySQLContainer mysql) {
        return new SpringApplicationBuilder(OunlogApplication.class)
                .web(WebApplicationType.SERVLET)
                .profiles("test")
                .run(
                        "--server.port=0",
                        "--spring.datasource.url=" + mysql.getJdbcUrl(),
                        "--spring.datasource.username=" + mysql.getUsername(),
                        "--spring.datasource.password=" + mysql.getPassword());
    }
}
