package ounlog.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import ounlog.auth.exception.AuthErrorCode;
import ounlog.auth.exception.AuthException;
import ounlog.auth.jwt.JwtTokenProvider;
import ounlog.auth.security.AuthenticatedMember;

@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;

    public LoginResult login(LoginCommand command) {
        Authentication authentication;

        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(
                            command.email(),
                            command.password()
                    )
            );
        } catch (AuthenticationException exception) {
            throw new AuthException(
                    AuthErrorCode.INVALID_CREDENTIALS
            );
        }

        AuthenticatedMember member = (AuthenticatedMember) authentication.getPrincipal();

        String accessToken = jwtTokenProvider.createAccessToken(member.memberId(), member.role());

        return new LoginResult(accessToken);
    }
}
