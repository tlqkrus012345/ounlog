package ounlog.auth.config;

import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.source.ImmutableJWKSet;
import com.nimbusds.jose.jwk.source.JWKSource;
import com.nimbusds.jose.proc.SecurityContext;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.interfaces.RSAPrivateKey;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.PKCS8EncodedKeySpec;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;
import ounlog.auth.jwt.JwtProperties;

@Configuration
public class JwtConfig {

    @Bean
    JwtEncoder jwtEncoder(JwtProperties properties) throws Exception {
        RSAKey rsaKey = new RSAKey.Builder(readPublicKey(properties.publicKeyLocation()))
                .privateKey(readPrivateKey(properties.privateKeyLocation()))
                .build();
        JWKSource<SecurityContext> jwkSource = new ImmutableJWKSet<>(new com.nimbusds.jose.jwk.JWKSet(rsaKey));
        return new NimbusJwtEncoder(jwkSource);
    }

    @Bean
    JwtDecoder jwtDecoder(JwtProperties properties) throws Exception {
        return NimbusJwtDecoder.withPublicKey(readPublicKey(properties.publicKeyLocation()))
                .build();
    }

    private RSAPrivateKey readPrivateKey(Resource resource) throws Exception {
        String pem = resource.getContentAsString(StandardCharsets.UTF_8);
        String content = pem.replace("-----BEGIN PRIVATE KEY-----", "")
                .replace("-----END PRIVATE KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(content);
        return (RSAPrivateKey) KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(decoded));
    }

    private RSAPublicKey readPublicKey(Resource resource) throws Exception {
        String pem = resource.getContentAsString(StandardCharsets.UTF_8);
        String content = pem.replace("-----BEGIN PUBLIC KEY-----", "")
                .replace("-----END PUBLIC KEY-----", "")
                .replaceAll("\\s", "");
        byte[] decoded = Base64.getDecoder().decode(content);
        return (RSAPublicKey) KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(decoded));
    }
}
