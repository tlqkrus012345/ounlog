package ounlog.member;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.never;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import ounlog.member.entity.Member;
import ounlog.member.exception.MemberErrorCode;
import ounlog.member.exception.MemberException;
import ounlog.member.repository.MemberRepository;
import ounlog.member.service.MemberService;
import ounlog.member.service.MemberSignupCommand;

@ExtendWith(MockitoExtension.class)
class MemberServiceTest {

    @Mock
    PasswordEncoder passwordEncoder;

    @Mock
    MemberRepository memberRepository;

    @InjectMocks
    MemberService memberService;

    @DisplayName("중복된 이메일로 가입하면 예외가 발생한다.")
    @Test
    void signupWithDuplicatedEmail() {
        given(memberRepository.existsByEmail("test@email.com")).willReturn(true);
        MemberSignupCommand command = new MemberSignupCommand("test@email.com", "password");

        assertThatThrownBy(() -> memberService.signup(command))
                .isInstanceOf(MemberException.class)
                .extracting(e -> ((MemberException) e).getErrorCode())
                .isEqualTo(MemberErrorCode.MEMBER_EMAIL_DUPLICATED);

        then(memberRepository).should(never()).saveAndFlush(any(Member.class));
    }
}
