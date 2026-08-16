package saju.member;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import saju.member.entity.Member;
import saju.member.exception.MemberException;
import saju.member.repository.MemberRepository;
import saju.member.service.MemberService;
import saju.member.service.MemberSignupCommand;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    MemberRepository memberRepository;

    @InjectMocks
    MemberService memberService;

    @DisplayName("이미 가입된 이메일이면 회원가입에 실패한다.")
    @Test
    void signupWithDuplicatedEmail() {
        given(memberRepository.existsByEmail("test@email.com")).willReturn(true);

        assertThatThrownBy(() -> memberService.signup(new MemberSignupCommand("test@email.com", "password")))
                .isInstanceOf(MemberException.class)
                .hasMessage("이미 가입된 이메일입니다.");

        then(passwordEncoder).shouldHaveNoInteractions();
        then(memberRepository).should(never()).save(any(Member.class));
    }
}
