package ounlog.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verifyNoInteractions;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.member.entity.Member;
import ounlog.member.repository.MemberRepository;
import ounlog.saju.service.SajuService;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(MysqlTestContainerConfig.class)
class AuthBrowserIntegrationTest {
    @LocalServerPort
    int port;

    @Autowired
    MemberRepository members;

    @Autowired
    PasswordEncoder passwords;

    @Autowired
    AuthSessionRepository sessions;

    @MockitoSpyBean
    SajuService saju;

    @Test
    void realHttpsBrowsersUseSpringAuthenticationAndSurviveBrowserRestart() throws Exception {
        members.save(Member.signup("browser@test.com", passwords.encode("password123!")));
        Path log = Path.of("build", "auth-browser.log");
        Process process = new ProcessBuilder("node", "src/test/browser/auth-smoke.mjs", Integer.toString(port))
                .redirectErrorStream(true)
                .redirectOutput(log.toFile())
                .start();
        try {
            boolean finished = process.waitFor(150, TimeUnit.SECONDS);
            assertThat(finished).as("Browser test timeout; see %s", log).isTrue();
            assertThat(process.exitValue()).as(Files.readString(log)).isZero();
            assertThat(sessions.count()).isEqualTo(6); // Two isolated browser sessions per engine.
            assertThat(sessions.findAll().stream()
                            .filter(session -> session.getRevokedAt() != null)
                            .count())
                    .isEqualTo(3);
            verifyNoInteractions(saju);
        } finally {
            process.destroyForcibly();
        }
    }
}
