package ounlog.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.member.entity.Member;
import ounlog.member.repository.MemberRepository;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@Import(MysqlTestContainerConfig.class)
@DataJpaTest
class MemberRepositoryTest {

    @Autowired
    MemberRepository memberRepository;

    @DisplayName("회원 정보가 정상적으로 DB에 저장이 된다.")
    @Test
    void signup() {
        Member member = Member.signup(
                "test@email.com",
                "password"
        );

        Member savedMember = memberRepository.save(member);

        assertThat(savedMember.getMemberId()).isNotNull();
        assertThat(savedMember.getEmail()).isEqualTo("test@email.com");
    }

    @DisplayName("동일한 이메일로 가입 시 유니크 제약 위반 예외가 발생한다.")
    @Test
    void signupWithUniqueException() {
        memberRepository.saveAndFlush(Member.signup("test@email.com", "password"));

        Member duplicated = Member.signup("test@email.com", "password");
        assertThatThrownBy(() -> memberRepository.saveAndFlush(duplicated))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}