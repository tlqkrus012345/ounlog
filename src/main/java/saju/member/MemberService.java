package saju.member;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MemberSignupResult signup(MemberSignupCommand command) {
        if (memberRepository.existsByEmail(command.email())) {
            throw new MemberException("이미 가입된 이메일입니다.");
        }

        final String encodedPassword = passwordEncoder.encode(command.password());

        Member member = Member.signup(
                command.email(),
                encodedPassword
        );

        Member savedMember = memberRepository.save(member);
        return MemberSignupResult.from(savedMember);
    }
}
