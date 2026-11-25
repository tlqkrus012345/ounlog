package ounlog.auth;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.auth.service.AuthenticationService;
import ounlog.auth.service.LoginCommand;
import ounlog.auth.service.RefreshTokens;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.member.entity.Member;
import ounlog.member.repository.MemberRepository;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Import(MysqlTestContainerConfig.class)
class AuthPathSecurityIntegrationTest {
    private static final String EMAIL = "path@test.com";
    private static final String PASSWORD = "password123!";
    private static final String LOGIN_BODY = "{\"email\":\"" + EMAIL + "\",\"password\":\"" + PASSWORD + "\"}";

    @LocalServerPort
    int port;

    @Autowired
    MemberRepository members;

    @Autowired
    AuthSessionRepository sessions;

    @Autowired
    AuthRefreshTokenRepository histories;

    @Autowired
    AuthenticationService auth;

    @Autowired
    PasswordEncoder passwords;

    @Autowired
    RefreshTokens tokens;

    @Autowired
    ObjectMapper mapper;

    private final HttpClient client = HttpClient.newHttpClient();
    private final Map<String, String> cookies = new HashMap<>();

    @BeforeEach
    void setup() {
        histories.deleteAllInBatch();
        sessions.deleteAllInBatch();
        members.deleteAllInBatch();
        members.save(Member.signup(EMAIL, passwords.encode(PASSWORD)));
    }

    static Stream<Arguments> paths() {
        return Stream.of(
                Arguments.of("/v1/auth/login", "/v1/auth/refresh", "/v1/auth/logout", "/v1/auth/csrf"),
                Arguments.of("/v1/auth/%6cogin", "/v1/auth/%72efresh", "/v1/auth/%6cogout", "/v1/auth/%63srf"),
                Arguments.of("/v1/%61uth/login", "/v1/%61uth/refresh", "/v1/%61uth/logout", "/v1/%61uth/csrf"));
    }

    @ParameterizedTest
    @MethodSource("paths")
    void missingOrInvalidCsrfCannotChangeAuthenticationState(
            String login, String refresh, String logout, String csrfPath) throws Exception {
        var initial = auth.login(new LoginCommand(EMAIL, PASSWORD));
        cookies.put("ounlog_refresh", initial.refreshToken());
        csrf("/v1/auth/csrf");

        for (String path : new String[] {login, refresh, logout}) {
            for (String csrf : new String[] {"", "invalid-masked-token"}) {
                var response = send("POST", path, path.equals(login) ? LOGIN_BODY : "", csrf, null);
                assertThat(response.statusCode())
                        .as("CSRF rejection for %s", path)
                        .isEqualTo(403);
                assertThat(mapper.readTree(response.body()).get("code").asString())
                        .isEqualTo("CSRF_INVALID");
                assertThat(sessions.count()).isEqualTo(1);
                assertThat(histories.count()).isEqualTo(1);
                var session = sessions.findAll().getFirst();
                assertThat(session.getRevokedAt()).isNull();
                assertThat(session.matchesRefreshHash(tokens.hash(initial.refreshToken())))
                        .isTrue();
                assertThat(members.findByEmail(EMAIL).orElseThrow().getFailedLoginCount())
                        .isZero();
            }
        }
    }

    @ParameterizedTest
    @MethodSource("paths")
    void validCsrfPreservesAuthenticationFlowAndNoStoreOnEncodedPaths(
            String login, String refresh, String logout, String csrfPath) throws Exception {
        String csrf = csrf(csrfPath);
        var signedIn = send("POST", login, LOGIN_BODY, csrf, "stale-token");
        assertThat(signedIn.statusCode()).isEqualTo(200);
        assertThat(sessions.count()).isEqualTo(1);

        csrf = csrf(csrfPath);
        var rotated = send("POST", refresh, "", csrf, "stale-token");
        assertThat(rotated.statusCode()).isEqualTo(200);
        assertThat(histories.count()).isEqualTo(2);
        String access = mapper.readTree(rotated.body()).get("accessToken").asString();
        assertThat(send("GET", "/v1/auth/session", "", null, access).statusCode())
                .isEqualTo(200);

        csrf = csrf(csrfPath);
        var signedOut = send("POST", logout, "", csrf, "stale-token");
        assertThat(signedOut.statusCode()).isEqualTo(204);
        assertThat(signedOut.body()).isEmpty();
        assertThat(sessions.findAll().getFirst().getRevokedAt()).isNotNull();
        assertThat(send("GET", "/v1/auth/session", "", null, access).statusCode())
                .isEqualTo(401);
    }

    private String csrf(String path) throws Exception {
        var response = send("GET", path, "", null, "stale-token");
        assertThat(response.statusCode()).isEqualTo(200);
        return mapper.readTree(response.body()).get("csrfToken").asString();
    }

    private HttpResponse<String> send(String method, String path, String body, String csrf, String bearer)
            throws Exception {
        var request = HttpRequest.newBuilder(URI.create("http://127.0.0.1:" + port + path))
                .method(method, HttpRequest.BodyPublishers.ofString(body));
        if (method.equals("POST")) request.header("Content-Type", "application/json");
        if (csrf != null && !csrf.isEmpty()) request.header("X-CSRF-TOKEN", csrf);
        if (bearer != null) request.header("Authorization", "Bearer " + bearer);
        if (!cookies.isEmpty())
            request.header(
                    "Cookie",
                    cookies.entrySet().stream()
                            .map(entry -> entry.getKey() + "=" + entry.getValue())
                            .collect(Collectors.joining("; ")));
        var response = client.send(request.build(), HttpResponse.BodyHandlers.ofString());
        for (String header : response.headers().allValues("Set-Cookie")) {
            String[] cookie = header.split(";", 2)[0].split("=", 2);
            if (cookie[1].isEmpty()) cookies.remove(cookie[0]);
            else cookies.put(cookie[0], cookie[1]);
        }
        assertThat(response.headers().firstValue("Cache-Control")).contains("no-store");
        return response;
    }
}
