package ounlog.member;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Import;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.member.entity.Member;
import ounlog.member.exception.MemberException;
import ounlog.member.repository.MemberRepository;
import ounlog.member.service.MemberService;
import ounlog.member.service.MemberSignupCommand;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;

import static org.assertj.core.api.Assertions.assertThat;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
@AutoConfigureMockMvc
class MemberIntegrationTest {

    @Autowired
    MemberService memberService;

    @Autowired
    MemberRepository memberRepository;

    @Autowired
    PasswordEncoder passwordEncoder;

    @Autowired
    MockMvc mockMvc;

    @BeforeEach
    void setUp() {
        memberRepository.deleteAll();
    }

    @DisplayName("회원 가입 시 인코딩된 비밀번호가 저장이 된다.")
    @Test
    void signup() {
        memberService.signup(new MemberSignupCommand("test@email.com", "password"));

        Member member = memberRepository.findByEmail("test@email.com")
                .orElseThrow();

        assertThat(member.getPasswordHash()).isNotEqualTo("password");
        assertThat(passwordEncoder.matches("password", member.getPasswordHash())).isTrue();
    }

    @DisplayName("동시에 같은 이메일로 가입하면 한 건만 성공한다.")
    @Test
    void signupWithDuplicateEmail() throws InterruptedException {
        int threadCount = 10;
        ExecutorService executor = Executors.newFixedThreadPool(threadCount);
        CountDownLatch latch = new CountDownLatch(threadCount);
        AtomicInteger successCount = new AtomicInteger();
        AtomicInteger failCount = new AtomicInteger();

        for (int i = 0; i < threadCount; i++) {
            executor.submit(() -> {
                try {
                    memberService.signup(new MemberSignupCommand("same@test.com", "pw"));
                    successCount.incrementAndGet();
                } catch (MemberException e) {
                    failCount.incrementAndGet();
                } finally {
                    latch.countDown();
                }
            });
        }
        latch.await();

        assertThat(successCount.get()).isEqualTo(1);
        assertThat(failCount.get()).isEqualTo(9);
    }
}
