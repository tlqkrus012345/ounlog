package saju.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import saju.config.MysqlTestContainerConfig;
import saju.member.entity.Member;
import saju.member.repository.MemberRepository;

import static org.assertj.core.api.Assertions.assertThat;

@Import(MysqlTestContainerConfig.class)
@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    MemberRepository memberRepository;

    @DisplayName("회원 정보가 정상적으로 DB에 저장이 된다.")
    @Test
    void signup() {
        Member member = Member.signup(
                "email@test.com",
                "password-hash"
        );

        Member savedMember = memberRepository.save(member);

        assertThat(savedMember.getMemberId()).isNotNull();
        assertThat(savedMember.getEmail()).isEqualTo("email@test.com");
    }
}