package ounlog.auth;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import jakarta.servlet.http.Cookie;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicReference;
import java.util.function.Supplier;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.context.annotation.Primary;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm;
import org.springframework.security.oauth2.jwt.*;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import ounlog.auth.controller.RefreshCookie;
import ounlog.auth.entity.AuthSession;
import ounlog.auth.exception.AuthException;
import ounlog.auth.repository.AuthRefreshTokenRepository;
import ounlog.auth.repository.AuthSessionRepository;
import ounlog.auth.service.*;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.member.entity.Member;
import ounlog.member.repository.MemberRepository;
import ounlog.saju.service.SajuService;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@SpringBootTest
@AutoConfigureMockMvc
@Import({MysqlTestContainerConfig.class, AuthIntegrationTest.TestConfig.class})
class AuthIntegrationTest {
    static final Instant START = Instant.parse("2026-11-24T00:00:00Z");
    static final String EMAIL = "auth@test.com";
    static final String PASSWORD = "password123!";

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper mapper;

    @Autowired
    MutableClock clock;

    @Autowired
    MemberRepository members;

    @MockitoSpyBean
    AuthSessionRepository sessions;

    @Autowired
    AuthRefreshTokenRepository histories;

    @Autowired
    RefreshTokens tokens;

    @Autowired
    AuthenticationService auth;

    @Autowired
    SessionTxService sessionTx;

    @Autowired
    PasswordEncoder passwords;

    @MockitoSpyBean
    JwtEncoder encoder;

    @Autowired
    JwtDecoder decoder;

    @Autowired
    JdbcTemplate jdbc;

    @Autowired
    PlatformTransactionManager transactionManager;

    @jakarta.persistence.PersistenceContext
    jakarta.persistence.EntityManager entityManager;

    @MockitoSpyBean
    SajuService saju;

    Long memberId;

    @BeforeEach
    void setup() {
        histories.deleteAllInBatch();
        sessions.deleteAllInBatch();
        members.deleteAllInBatch();
        clock.set(START);
        memberId =
                members.save(Member.signup(EMAIL, passwords.encode(PASSWORD))).getMemberId();
    }

    @Test
    void realLoginIssuesSignedTokenPersistentCookieAndOnlyHashesAtRest() throws Exception {
        Device device = login();
        Jwt jwt = decoder.decode(device.access());
        assertThat(jwt.getSubject()).isEqualTo(memberId.toString());
        assertThat(jwt.getClaimAsString("sid")).isEqualTo(device.sid());
        assertThat(jwt.getExpiresAt()).isEqualTo(START.plusSeconds(900));
        assertThat(device.body().get("session").get("memberId").isString()).isTrue();
        assertThat(device.body().get("session").get("sessionExpiresAt").asString())
                .isEqualTo(START.plusSeconds(28800).toString());
        assertThat(device.refresh().getMaxAge()).isEqualTo(86400);
        assertThat(device.refresh().getDomain()).isNull();
        assertThat(device.refresh().isHttpOnly()).isTrue();
        assertThat(device.refresh().getSecure()).isTrue();
        assertThat(device.refresh().getPath()).isEqualTo("/v1/auth");
        assertThat(device.refresh().getAttribute("SameSite")).isEqualTo("Lax");
        assertThat(device.body().has("refreshToken")).isFalse();
        assertThat(histories.findSessionIdByHash(tokens.hash(device.refresh().getValue())))
                .contains(device.sid());
        assertThat(jdbc.queryForObject("select octet_length(token_hash) from auth_refresh_token", Integer.class))
                .isEqualTo(32);
        assertThat(jdbc.queryForObject("select @@transaction_isolation", String.class))
                .isEqualTo("REPEATABLE-READ");
        verifyNoInteractions(saju);
    }

    @Test
    void fifthFailureIsCommittedAndLockDoesNotExtendOrInvalidateExistingSession() throws Exception {
        Device device = login();
        for (int i = 1; i <= 5; i++) {
            invalidPassword();
            assertThat(member().getFailedLoginCount()).isEqualTo((byte) i);
        }
        Instant until = member().getLoginLockedUntil();
        assertThat(until).isEqualTo(START.plusSeconds(600));
        clock.set(START.plusSeconds(30));
        var denied = loginRequest(EMAIL, PASSWORD, csrf())
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertError(denied, 401, "INVALID_CREDENTIALS");
        assertThat(member().getLoginLockedUntil()).isEqualTo(until);
        assertThat(member().getFailedLoginCount()).isEqualTo((byte) 5);
        session(device, null).andExpect(status().isOk());
        clock.set(until);
        invalidPassword();
        assertThat(member().getFailedLoginCount()).isEqualTo((byte) 1);
        assertThat(member().getLoginLockedUntil()).isNull();
        login();
        assertThat(member().getFailedLoginCount()).isZero();
    }

    @Test
    void successfulLoginResetsConsecutiveFailuresButMidnightDoesNot() throws Exception {
        clock.set(Instant.parse("2026-11-24T23:59:59Z"));
        for (int i = 0; i < 4; i++) invalidPassword();
        login();
        assertThat(member().getFailedLoginCount()).isZero();
        for (int i = 0; i < 4; i++) invalidPassword();
        clock.set(Instant.parse("2026-11-25T00:00:00Z"));
        invalidPassword();
        assertThat(member().getFailedLoginCount()).isEqualTo((byte) 5);
    }

    @Test
    void missingWithdrawnWrongAndLockedAccountsHaveSameGenericResponse() throws Exception {
        var wrong = loginRequest(EMAIL, "wrong", csrf()).andReturn();
        var missing = loginRequest("missing@test.com", PASSWORD, csrf()).andReturn();
        jdbc.update("update member set status = 'WITHDRAWN' where member_id = ?", memberId);
        var withdrawn = loginRequest(EMAIL, PASSWORD, csrf()).andReturn();
        jdbc.update("update member set status = 'ACTIVE' where member_id = ?", memberId);
        for (int i = 0; i < 4; i++) invalidPassword();
        var locked = loginRequest(EMAIL, PASSWORD, csrf()).andReturn();
        for (var response : List.of(wrong, missing, withdrawn, locked)) {
            assertError(response, 401, "INVALID_CREDENTIALS");
            assertThat(json(response).get("message").asString()).isEqualTo("이메일 또는 비밀번호가 올바르지 않거나 로그인이 일시적으로 제한되었습니다.");
            assertThat(response.getResponse().getHeader("Retry-After")).isNull();
            assertThat(json(response).has("errors")).isFalse();
        }
    }

    @Test
    void concurrentFailuresAreSerializedAndStopAtFive() throws Exception {
        List<Integer> statuses = concurrently(8, () -> {
            try {
                auth.login(new LoginCommand(EMAIL, "wrong"));
                return 200;
            } catch (AuthException exception) {
                return exception.getErrorCode().getStatus().value();
            }
        });
        assertThat(statuses).containsOnly(401);
        assertThat(member().getFailedLoginCount()).isEqualTo((byte) 5);
        assertThat(member().getLoginLockedUntil()).isEqualTo(START.plusSeconds(600));
        assertThat(sessions.count()).isZero();
    }

    @Test
    void successRacingFifthFailureFollowsMemberLockOrder() throws Exception {
        for (int i = 0; i < 4; i++) invalidPassword();
        List<Integer> results = race(() -> loginStatus(PASSWORD), () -> loginStatus("wrong"));
        if (results.getFirst() == 200) {
            assertThat(member().getFailedLoginCount()).isEqualTo((byte) 1);
            assertThat(member().getLoginLockedUntil()).isNull();
        } else {
            assertThat(member().getFailedLoginCount()).isEqualTo((byte) 5);
            assertThat(member().getLoginLockedUntil()).isNotNull();
        }
    }

    @Test
    void rotationNeedsNoAccessTokenAndDoesNotCountAsActivityOrRestartCookieLifetime() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(3600));
        Device rotated = refreshed(device);
        assertThat(rotated.refresh().getValue()).isNotEqualTo(device.refresh().getValue());
        assertThat(rotated.refresh().getMaxAge()).isEqualTo(86400 - 3600);
        assertThat(sessions.findById(device.sid()).orElseThrow().getLastActivityAt())
                .isEqualTo(START);
        assertThat(histories.count()).isEqualTo(2);
        assertThat(histories.findSessionIdByHash(tokens.hash(device.refresh().getValue())))
                .contains(device.sid());
        session(rotated, null).andExpect(status().isOk());
    }

    @Test
    void oldRefreshReuseCommitsRevocationBefore401AndInvalidatesNewJwtAndRefresh() throws Exception {
        Device first = login();
        Device second = refreshed(first);
        var rejected = refreshRequest(first.refresh(), csrf())
                .andExpect(status().isUnauthorized())
                .andReturn();
        assertError(rejected, 401, "SESSION_INVALID");
        assertThat(sessions.findById(first.sid()).orElseThrow().getRevokedAt()).isEqualTo(START);
        assertError(session(second, null).andReturn(), 401, "SESSION_INVALID");
        assertError(refreshRequest(second.refresh(), csrf()).andReturn(), 401, "SESSION_INVALID");
    }

    @Test
    void simultaneousRefreshRotatesThenRevokesTheSession() throws Exception {
        Device device = login();
        List<Integer> results = concurrently(2, () -> {
            try {
                auth.refresh(device.refresh().getValue());
                return 200;
            } catch (AuthException exception) {
                return 401;
            }
        });
        assertThat(results).containsExactlyInAnyOrder(200, 401);
        assertThat(sessions.findById(device.sid()).orElseThrow().getRevokedAt()).isNotNull();
        assertError(session(device, null).andReturn(), 401, "SESSION_INVALID");
    }

    @Test
    void logoutUsingOldRefreshRevokesOnlyThatDeviceAndCannotBeUndoneByActivity() throws Exception {
        Device first = login();
        Device secondDevice = login();
        Device rotated = refreshed(first);
        logout(first.refresh(), csrf())
                .andExpect(status().isNoContent())
                .andExpect(content().string(""))
                .andExpect(cookie().maxAge(RefreshCookie.NAME, 0));
        assertError(session(rotated, "true").andReturn(), 401, "SESSION_INVALID");
        session(secondDevice, null).andExpect(status().isOk());
        assertThat(sessions.findById(secondDevice.sid()).orElseThrow().getRevokedAt())
                .isNull();
        logout(first.refresh(), csrf()).andExpect(status().isNoContent());
    }

    @Test
    void refreshRacingLogoutAlwaysEndsRevoked() throws Exception {
        Device device = login();
        race(
                () -> {
                    try {
                        auth.refresh(device.refresh().getValue());
                    } catch (AuthException ignored) {
                    }
                    return 0;
                },
                () -> {
                    auth.logout(device.refresh().getValue());
                    return 0;
                });
        assertThat(sessions.findById(device.sid()).orElseThrow().getRevokedAt()).isNotNull();
        assertError(session(device, null).andReturn(), 401, "SESSION_INVALID");
    }

    @Test
    void activityRacingLogoutAlwaysEndsRevoked() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(30));
        race(
                () -> {
                    try {
                        sessionTx.validateAndTouch(device.sid(), memberId);
                    } catch (AuthException ignored) {
                    }
                    return 0;
                },
                () -> {
                    auth.logout(device.refresh().getValue());
                    return 0;
                });
        assertThat(sessions.findById(device.sid()).orElseThrow().getRevokedAt()).isNotNull();
        assertError(session(device, "true").andReturn(), 401, "SESSION_INVALID");
    }

    @Test
    void onlyExplicitActivityExtendsIdleDeadlineAndNeverTheAbsoluteDeadline() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(7 * 3600));
        device = refreshed(device);
        session(device, null).andExpect(status().isOk());
        session(device, "false").andExpect(status().isOk());
        assertThat(sessions.findById(device.sid()).orElseThrow().getLastActivityAt())
                .isEqualTo(START);
        session(device, "true")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionExpiresAt")
                        .value(START.plusSeconds(15 * 3600).toString()));
        clock.set(START.plusSeconds(14 * 3600));
        device = refreshed(device);
        session(device, "true").andExpect(status().isOk());
        clock.set(START.plusSeconds(21 * 3600));
        device = refreshed(device);
        session(device, "true")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sessionExpiresAt")
                        .value(START.plusSeconds(24 * 3600).toString()));
        clock.set(START.plusSeconds(24 * 3600));
        assertError(refreshRequest(device.refresh(), csrf()).andReturn(), 401, "SESSION_EXPIRED");
        assertThat(sessions.findById(device.sid()).orElseThrow().getAbsoluteExpiresAt())
                .isEqualTo(START.plusSeconds(86400));
    }

    @Test
    void exactIdleExpiryRejectsActivityInsteadOfRevivingSession() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(8 * 3600 - 1));
        device = refreshed(device);
        clock.set(START.plusSeconds(8 * 3600));
        assertError(session(device, "true").andReturn(), 401, "SESSION_EXPIRED");
        assertThat(sessions.findById(device.sid()).orElseThrow().getLastActivityAt())
                .isEqualTo(START);
        assertError(refreshRequest(device.refresh(), csrf()).andReturn(), 401, "SESSION_EXPIRED");
    }

    @Test
    void lockWaitUsesTimeAfterAcquisition() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(8 * 3600 - 1));
        CountDownLatch enteringLock = new CountDownLatch(1);
        doAnswer(invocation -> {
                    enteringLock.countDown();
                    return Optional.ofNullable(entityManager.find(
                            AuthSession.class, device.sid(), jakarta.persistence.LockModeType.PESSIMISTIC_WRITE));
                })
                .when(sessions)
                .findLockedById(device.sid());
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            AtomicReference<Future<SessionInfo>> waiting = new AtomicReference<>();
            new TransactionTemplate(transactionManager).executeWithoutResult(status -> {
                jdbc.queryForObject(
                        "select session_id from auth_session where session_id = ? for update",
                        String.class,
                        device.sid());
                waiting.set(executor.submit(() -> sessionTx.validateAndTouch(device.sid(), memberId)));
                try {
                    assertThat(enteringLock.await(5, TimeUnit.SECONDS)).isTrue();
                } catch (InterruptedException exception) {
                    throw new RuntimeException(exception);
                }
                clock.set(START.plusSeconds(8 * 3600));
            });
            assertThatThrownBy(() -> waiting.get().get(5, TimeUnit.SECONDS)).hasCauseInstanceOf(AuthException.class);
        }
        assertThat(sessions.findById(device.sid()).orElseThrow().getLastActivityAt())
                .isEqualTo(START);
    }

    @Test
    void exactAccessExpiryRejectsBeforeBusinessAndRefreshStillWorks() throws Exception {
        Device device = login();
        clock.set(START.plusSeconds(900));
        var result = mvc.perform(post("/v1/saju/analysis")
                        .secure(true)
                        .header("Authorization", "Bearer " + device.access())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andReturn();
        assertError(result, 401, "ACCESS_TOKEN_EXPIRED");
        assertThat(result.getResponse().getHeader("WWW-Authenticate")).isEqualTo("Bearer");
        verifyNoInteractions(saju);
        session(refreshed(device), null).andExpect(status().isOk());
    }

    @Test
    void jwtMustHaveAllClaimsAndMatchSessionOwnerAndSignature() throws Exception {
        Device device = login();
        Map<String, Object> valid =
                new HashMap<>(decoder.decode(device.access()).getClaims());
        for (String required : List.of("sub", "sid", "role", "iat", "exp")) {
            Map<String, Object> claims = new HashMap<>(valid);
            claims.remove(required);
            assertError(session(signed(claims), null).andReturn(), 401, "SESSION_INVALID");
        }
        for (Map.Entry<String, Object> invalid : Map.<String, Object>of(
                        "sub", "-1", "sid", "not-a-uuid", "role", "ADMIN")
                .entrySet()) {
            var claims = new HashMap<>(valid);
            claims.put(invalid.getKey(), invalid.getValue());
            assertError(session(signed(claims), null).andReturn(), 401, "SESSION_INVALID");
        }
        var wrongOwner = new HashMap<>(valid);
        wrongOwner.put("sub", Long.toString(memberId + 1));
        assertError(session(signed(wrongOwner), null).andReturn(), 401, "SESSION_INVALID");
        String[] parts = device.access().split("\\.");
        parts[2] = (parts[2].startsWith("a") ? "b" : "a") + parts[2].substring(1);
        assertError(session(String.join(".", parts), null).andReturn(), 401, "SESSION_INVALID");
        assertError(mvc.perform(get("/v1/auth/session").secure(true)).andReturn(), 401, "AUTHENTICATION_REQUIRED");
        jdbc.update("update member set status = 'WITHDRAWN' where member_id = ?", memberId);
        assertError(session(device, null).andReturn(), 401, "SESSION_INVALID");
    }

    @Test
    void csrfIsMaskedHeaderOnlyAndRotatesBrowserContextOnLoginAndLogout() throws Exception {
        Csrf csrf = csrf();
        assertThat(csrf.token()).isNotEqualTo(csrf.cookie().getValue());
        assertThat(csrf.cookie().isHttpOnly()).isTrue();
        assertThat(csrf.cookie().getSecure()).isTrue();
        assertThat(csrf.cookie().getPath()).isEqualTo("/");
        var noHeader = mvc.perform(post("/v1/auth/login")
                        .secure(true)
                        .cookie(csrf.cookie())
                        .param("_csrf", csrf.token())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(credentials(EMAIL, PASSWORD)))
                .andReturn();
        assertError(noHeader, 403, "CSRF_INVALID");
        for (String path : List.of("/login", "/refresh", "/logout")) {
            assertError(
                    mvc.perform(post("/v1/auth" + path)
                                    .secure(true)
                                    .contentType(MediaType.APPLICATION_JSON)
                                    .content(credentials(EMAIL, PASSWORD)))
                            .andReturn(),
                    403,
                    "CSRF_INVALID");
        }
        Device device = device(loginRequest(EMAIL, PASSWORD, csrf)
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("__Host-ounlog_csrf", 0))
                .andReturn());
        Csrf fresh = csrf();
        assertError(
                refreshRequest(device.refresh(), new Csrf(fresh.cookie(), csrf.token()))
                        .andReturn(),
                403,
                "CSRF_INVALID");
        logout(device.refresh(), fresh)
                .andExpect(status().isNoContent())
                .andExpect(cookie().maxAge("__Host-ounlog_csrf", 0));
        assertThat(member().getFailedLoginCount()).isZero();
        assertThat(mvc.perform(get("/v1/auth/csrf").secure(true))
                        .andReturn()
                        .getRequest()
                        .getSession(false))
                .isNull();
    }

    @Test
    void malformedInputReturns400WithoutCountingOrLeakingRejectedValues() throws Exception {
        for (String content : List.of(
                "{",
                "null",
                "[]",
                "{\"email\":\"auth@test.com\",\"password\":123}",
                "{\"email\":123,\"password\":\"password123!\"}")) {
            var c = csrf();
            var result = mvc.perform(post("/v1/auth/login")
                            .secure(true)
                            .cookie(c.cookie())
                            .header("X-CSRF-TOKEN", c.token())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(content))
                    .andReturn();
            assertError(result, 400, "INVALID_REQUEST");
            assertThat(json(result).has("errors")).isFalse();
        }
        Device device = login();
        assertError(session(device, "TRUE").andReturn(), 400, "INVALID_REQUEST");
        assertThat(member().getFailedLoginCount()).isZero();
    }

    @Test
    void logoutIsIdempotentForMissingInvalidExpiredCookiesAndMissingRefreshIs401() throws Exception {
        logout(null, csrf())
                .andExpect(status().isNoContent())
                .andExpect(content().string(""));
        logout(new Cookie(RefreshCookie.NAME, "invalid"), csrf()).andExpect(status().isNoContent());
        logout(new Cookie(RefreshCookie.NAME, tokens.generate()), csrf()).andExpect(status().isNoContent());
        assertError(refreshRequest(null, csrf()).andReturn(), 401, "AUTHENTICATION_REQUIRED");
        Device device = login();
        clock.set(START.plusSeconds(86400));
        logout(device.refresh(), csrf()).andExpect(status().isNoContent());
    }

    @Test
    void signingFailureRollsBackResetSessionAndRotationAndDoesNotIssueCookies() throws Exception {
        invalidPassword();
        doThrow(new JwtEncodingException("injected signing failure"))
                .when(encoder)
                .encode(any());
        var failed = loginRequest(EMAIL, PASSWORD, csrf()).andReturn();
        assertError(failed, 500, "INTERNAL_SERVER_ERROR");
        assertThat(failed.getResponse().getCookie(RefreshCookie.NAME)).isNull();
        assertThat(sessions.count()).isZero();
        assertThat(histories.count()).isZero();
        assertThat(member().getFailedLoginCount()).isEqualTo((byte) 1);
        reset(encoder);
        Device device = login();
        doThrow(new JwtEncodingException("injected signing failure"))
                .when(encoder)
                .encode(any());
        assertError(refreshRequest(device.refresh(), csrf()).andReturn(), 500, "INTERNAL_SERVER_ERROR");
        assertThat(histories.count()).isEqualTo(1);
        assertThat(sessions.findById(device.sid())
                        .orElseThrow()
                        .matchesRefreshHash(tokens.hash(device.refresh().getValue())))
                .isTrue();
        reset(encoder);
        refreshed(device);
    }

    @Test
    void databaseFailureIs500AndLogoutDoesNotClearCookiesOnFailure() throws Exception {
        Device device = login();
        doThrow(new DataAccessResourceFailureException("injected database failure"))
                .when(sessions)
                .findById(device.sid());
        assertError(session(device, null).andReturn(), 500, "INTERNAL_SERVER_ERROR");
        reset(sessions);
        doThrow(new DataAccessResourceFailureException("injected database failure"))
                .when(sessions)
                .findLockedById(device.sid());
        var failedLogout = logout(device.refresh(), csrf()).andReturn();
        assertError(failedLogout, 500, "INTERNAL_SERVER_ERROR");
        assertThat(failedLogout.getResponse().getCookie(RefreshCookie.NAME)).isNull();
        reset(sessions);
        session(device, null).andExpect(status().isOk());
    }

    @Test
    void cleanupKeepsRevokedHistoryUntilAbsoluteExpiryThenCascadesInBatches() throws Exception {
        Device first = login();
        Device second = login();
        auth.logout(first.refresh().getValue());
        var tx = new TransactionTemplate(transactionManager);
        assertThat(tx.<Integer>execute(status -> sessions.deleteExpiredBatch(START.plusSeconds(86399), 1)))
                .isZero();
        assertThat(histories.count()).isEqualTo(2);
        assertThat(tx.<Integer>execute(status -> sessions.deleteExpiredBatch(START.plusSeconds(86400), 1)))
                .isEqualTo(1);
        assertThat(sessions.count()).isEqualTo(1);
        assertThat(histories.count()).isEqualTo(1);
        assertThat(tx.<Integer>execute(status -> sessions.deleteExpiredBatch(START.plusSeconds(86400), 1)))
                .isEqualTo(1);
        assertThat(histories.count()).isZero();
    }

    private Member member() {
        return members.findById(memberId).orElseThrow();
    }

    private int loginStatus(String password) {
        try {
            auth.login(new LoginCommand(EMAIL, password));
            return 200;
        } catch (AuthException exception) {
            return 401;
        }
    }

    private void invalidPassword() throws Exception {
        assertError(loginRequest(EMAIL, "wrong", csrf()).andReturn(), 401, "INVALID_CREDENTIALS");
    }

    private Device login() throws Exception {
        return device(
                loginRequest(EMAIL, PASSWORD, csrf()).andExpect(status().isOk()).andReturn());
    }

    private Device refreshed(Device device) throws Exception {
        return device(refreshRequest(device.refresh(), csrf())
                .andExpect(status().isOk())
                .andReturn());
    }

    private org.springframework.test.web.servlet.ResultActions loginRequest(String email, String password, Csrf csrf)
            throws Exception {
        return mvc.perform(post("/v1/auth/login")
                .secure(true)
                .cookie(csrf.cookie())
                .header("X-CSRF-TOKEN", csrf.token())
                .contentType(MediaType.APPLICATION_JSON)
                .content(credentials(email, password)));
    }

    private String credentials(String email, String password) {
        return mapper.writeValueAsString(Map.of("email", email, "password", password));
    }

    private org.springframework.test.web.servlet.ResultActions refreshRequest(Cookie cookie, Csrf csrf)
            throws Exception {
        var request = post("/v1/auth/refresh")
                .secure(true)
                .cookie(csrf.cookie())
                .header("X-CSRF-TOKEN", csrf.token())
                .header("Authorization", "Bearer stale-token-must-be-ignored");
        if (cookie != null) request.cookie(cookie);
        return mvc.perform(request);
    }

    private org.springframework.test.web.servlet.ResultActions logout(Cookie cookie, Csrf csrf) throws Exception {
        var request = post("/v1/auth/logout").secure(true).cookie(csrf.cookie()).header("X-CSRF-TOKEN", csrf.token());
        if (cookie != null) request.cookie(cookie);
        return mvc.perform(request);
    }

    private org.springframework.test.web.servlet.ResultActions session(Device device, String activity)
            throws Exception {
        return session(device.access(), activity);
    }

    private org.springframework.test.web.servlet.ResultActions session(String access, String activity)
            throws Exception {
        var request = get("/v1/auth/session").secure(true).header("Authorization", "Bearer " + access);
        if (activity != null) request.header("X-User-Activity", activity);
        return mvc.perform(request);
    }

    private Csrf csrf() throws Exception {
        var result = mvc.perform(get("/v1/auth/csrf").secure(true).header("Authorization", "Bearer ignored"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andReturn();
        return new Csrf(
                result.getResponse().getCookie("__Host-ounlog_csrf"),
                json(result).get("csrfToken").asString());
    }

    private Device device(MvcResult result) throws Exception {
        JsonNode body = json(result);
        String access = body.get("accessToken").asString();
        return new Device(
                access,
                result.getResponse().getCookie(RefreshCookie.NAME),
                decoder.decode(access).getClaimAsString("sid"),
                body);
    }

    private JsonNode json(MvcResult result) throws Exception {
        return mapper.readTree(result.getResponse().getContentAsString());
    }

    private void assertError(MvcResult result, int status, String code) throws Exception {
        assertThat(result.getResponse().getStatus())
                .as(result.getResponse().getContentAsString())
                .isEqualTo(status);
        JsonNode error = json(result);
        assertThat(error.get("status").asInt()).isEqualTo(status);
        assertThat(error.get("code").asString()).isEqualTo(code);
        assertThat(error.get("path").asString()).doesNotContain("?");
        assertThat(error.get("timestamp").asString()).endsWith("Z");
        assertThat(result.getResponse().getHeader("Cache-Control")).isEqualTo("no-store");
    }

    private String signed(Map<String, Object> claims) {
        return encoder.encode(JwtEncoderParameters.from(
                        JwsHeader.with(SignatureAlgorithm.RS256).build(),
                        JwtClaimsSet.builder()
                                .claims(target -> target.putAll(claims))
                                .build()))
                .getTokenValue();
    }

    private <T> List<T> concurrently(int count, Supplier<T> operation) throws Exception {
        var operations = new ArrayList<Supplier<T>>();
        for (int i = 0; i < count; i++) operations.add(operation);
        return race(operations);
    }

    @SafeVarargs
    private final <T> List<T> race(Supplier<T>... operations) throws Exception {
        return race(List.of(operations));
    }

    private <T> List<T> race(List<Supplier<T>> operations) throws Exception {
        try (var executor = Executors.newVirtualThreadPerTaskExecutor()) {
            CountDownLatch ready = new CountDownLatch(operations.size());
            CountDownLatch start = new CountDownLatch(1);
            List<Future<T>> futures = new ArrayList<>();
            for (Supplier<T> operation : operations)
                futures.add(executor.submit(() -> {
                    ready.countDown();
                    if (!start.await(10, TimeUnit.SECONDS)) throw new IllegalStateException("start timed out");
                    return operation.get();
                }));
            assertThat(ready.await(10, TimeUnit.SECONDS)).isTrue();
            start.countDown();
            List<T> results = new ArrayList<>();
            for (Future<T> future : futures) results.add(future.get(20, TimeUnit.SECONDS));
            return results;
        }
    }

    record Csrf(Cookie cookie, String token) {}

    record Device(String access, Cookie refresh, String sid, JsonNode body) {}

    @TestConfiguration(proxyBeanMethods = false)
    static class TestConfig {
        @Bean
        @Primary
        MutableClock authTestClock() {
            return new MutableClock();
        }
    }

    static class MutableClock extends Clock {
        private final AtomicReference<Instant> now = new AtomicReference<>(START);

        void set(Instant instant) {
            now.set(instant);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now.get();
        }
    }
}
