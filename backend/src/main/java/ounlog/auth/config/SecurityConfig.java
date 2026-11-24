package ounlog.auth.config;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.env.Environment;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.oauth2.server.resource.authentication.JwtGrantedAuthoritiesConverter;
import org.springframework.security.oauth2.server.resource.web.DefaultBearerTokenResolver;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.security.*;
import ounlog.auth.service.SessionTxService;
import tools.jackson.databind.ObjectMapper;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            JwtDecoder jwtDecoder,
            Environment environment,
            SessionTxService sessions,
            ObjectMapper mapper,
            Clock clock,
            CookieCsrfTokenRepository csrfRepository)
            throws Exception {
        AuthErrorWriter errors = new AuthErrorWriter(mapper, clock);
        AuthEntryPoint entryPoint = new AuthEntryPoint(errors);
        DefaultBearerTokenResolver resolver = new DefaultBearerTokenResolver();
        http.csrf(csrf -> csrf.csrfTokenRepository(csrfRepository)
                        .csrfTokenRequestHandler(new HeaderCsrfTokenHandler())
                        .requireCsrfProtectionMatcher(AuthEndpoints::requiresCsrf))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .logout(logout -> logout.disable())
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(entryPoint)
                        .accessDeniedHandler((request, response, denied) ->
                                errors.write(request, response, AuthErrorCode.CSRF_INVALID, false)))
                .authorizeHttpRequests(auth -> {
                    if (environment.matchesProfiles("dev")) {
                        auth.requestMatchers(
                                        HttpMethod.GET,
                                        "/v3/api-docs",
                                        "/v3/api-docs/**",
                                        "/v3/api-docs.yaml",
                                        "/swagger-ui.html",
                                        "/swagger-ui/**")
                                .permitAll();
                    }
                    auth.requestMatchers(
                                    HttpMethod.POST,
                                    "/v1/members/signup",
                                    "/v1/saju/previews",
                                    "/v1/auth/login",
                                    "/v1/auth/refresh",
                                    "/v1/auth/logout")
                            .permitAll()
                            .requestMatchers(HttpMethod.GET, "/v1/auth/csrf")
                            .permitAll()
                            .anyRequest()
                            .authenticated();
                })
                .oauth2ResourceServer(oauth2 -> oauth2.bearerTokenResolver(
                                request -> AuthEndpoints.ignoresBearer(request) ? null : resolver.resolve(request))
                        .authenticationEntryPoint(entryPoint)
                        .jwt(jwt -> jwt.decoder(jwtDecoder).jwtAuthenticationConverter(jwtAuthenticationConverter())))
                .addFilterBefore(new AuthNoStoreFilter(), CsrfFilter.class)
                .addFilterAfter(new SessionGuardFilter(sessions, errors), BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    CookieCsrfTokenRepository csrfTokenRepository() {
        CookieCsrfTokenRepository repository = new CookieCsrfTokenRepository();
        repository.setCookieName("__Host-ounlog_csrf");
        repository.setHeaderName("X-CSRF-TOKEN");
        repository.setCookiePath("/");
        repository.setCookieCustomizer(
                cookie -> cookie.secure(true).httpOnly(true).sameSite("Lax"));
        return repository;
    }

    @Bean
    JwtAuthenticationConverter jwtAuthenticationConverter() {
        JwtGrantedAuthoritiesConverter authorities = new JwtGrantedAuthoritiesConverter();
        authorities.setAuthoritiesClaimName("role");
        authorities.setAuthorityPrefix("ROLE_");
        JwtAuthenticationConverter converter = new JwtAuthenticationConverter();
        converter.setJwtGrantedAuthoritiesConverter(authorities);
        return converter;
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder passwords) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(passwords);
        return new ProviderManager(provider);
    }
}
