package ounlog.auth;

import static org.mockito.Mockito.mock;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.mock.web.MockServletContext;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.web.FilterChainProxy;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.context.support.AnnotationConfigWebApplicationContext;
import org.springframework.web.servlet.config.annotation.EnableWebMvc;
import ounlog.auth.config.SecurityConfig;

class SecurityConfigTest {

    private static final String[] DOCUMENT_PATHS = {
        "/v3/api-docs", "/v3/api-docs.yaml", "/v3/api-docs/swagger-config", "/swagger-ui.html", "/swagger-ui/index.html"
    };

    @ParameterizedTest
    @ValueSource(
            strings = {
                "/v3/api-docs",
                "/v3/api-docs.yaml",
                "/v3/api-docs/swagger-config",
                "/swagger-ui.html",
                "/swagger-ui/index.html"
            })
    void devAllowsAnonymousDocumentReads(String path) throws Exception {
        try (var context = context("dev")) {
            mvc(context).perform(get(path)).andExpect(status().isOk());
        }
    }

    @ParameterizedTest
    @ValueSource(strings = {"test", "prod"})
    void nonDevRequiresAuthenticationForDocuments(String profile) throws Exception {
        try (var context = context(profile)) {
            MockMvc mvc = mvc(context);
            for (String path : DOCUMENT_PATHS) {
                mvc.perform(get(path)).andExpect(status().isUnauthorized());
            }
        }
    }

    @Test
    void defaultProfileRequiresAuthenticationForDocuments() throws Exception {
        try (var context = context()) {
            MockMvc mvc = mvc(context);
            for (String path : DOCUMENT_PATHS) {
                mvc.perform(get(path)).andExpect(status().isUnauthorized());
            }
        }
    }

    @Test
    void devStillProtectsBusinessApisAndDocumentWrites() throws Exception {
        try (var context = context("dev")) {
            MockMvc mvc = mvc(context);
            mvc.perform(get("/v1/saju/analysis")).andExpect(status().isUnauthorized());
            mvc.perform(post("/v3/api-docs.yaml")).andExpect(status().isUnauthorized());
        }
    }

    private AnnotationConfigWebApplicationContext context(String... profiles) {
        var context = new AnnotationConfigWebApplicationContext();
        context.setServletContext(new MockServletContext());
        var environment = new MockEnvironment();
        environment.setActiveProfiles(profiles);
        context.setEnvironment(environment);
        context.register(SecurityConfig.class, TestConfig.class);
        context.refresh();
        return context;
    }

    private MockMvc mvc(AnnotationConfigWebApplicationContext context) {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean(FilterChainProxy.class))
                .build();
    }

    @Configuration(proxyBeanMethods = false)
    @EnableWebMvc
    static class TestConfig {

        @Bean
        JwtDecoder jwtDecoder() {
            return mock(JwtDecoder.class);
        }

        @Bean
        UserDetailsService userDetailsService() {
            return mock(UserDetailsService.class);
        }

        @Bean
        PasswordEncoder passwordEncoder() {
            return mock(PasswordEncoder.class);
        }

        @Bean
        DocumentController documentController() {
            return new DocumentController();
        }
    }

    // Stub responses isolate authorization from springdoc generation and database startup.
    @RestController
    static class DocumentController {

        @GetMapping({
            "/v3/api-docs",
            "/v3/api-docs.yaml",
            "/v3/api-docs/swagger-config",
            "/swagger-ui.html",
            "/swagger-ui/index.html"
        })
        String document() {
            return "document";
        }
    }
}
