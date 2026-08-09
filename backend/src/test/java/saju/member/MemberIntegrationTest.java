package saju.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import saju.config.MysqlTestContainerConfig;

import static org.assertj.core.api.Assertions.assertThat;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
class MemberIntegrationTest {

    @Autowired
    MemberService memberService;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @DisplayName("회원 가입 시 인코딩된 비밀번호가 저장이 된다.")
    @Test
    void signup() {
        memberService.signup(new MemberSignupCommand("test@email.com", "password"));

        Member member = memberRepository.findByEmail("test@email.com")
                .orElseThrow();

        assertThat(member.getPasswordHash()).isNotEqualTo("password");
        assertThat(passwordEncoder.matches("password", member.getPasswordHash())).isTrue();
    }
}
