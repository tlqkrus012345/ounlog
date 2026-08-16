package saju.member.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import saju.member.entity.Member;
import saju.member.exception.MemberErrorCode;
import saju.member.exception.MemberException;
import saju.member.repository.MemberRepository;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public MemberSignupResult signup(MemberSignupCommand command) {
        if (memberRepository.existsByEmail(command.email())) {
            throw new MemberException(MemberErrorCode.MEMBER_EMAIL_DUPLICATED);
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
