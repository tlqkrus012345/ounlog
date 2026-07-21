package saju.member;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
@RequiredArgsConstructor
public class MemberService {

    private final MemberRepository memberRepository;

    public void signup(MemberSignupCommand command) {
        Member member = Member.signup(
                command.email(),
                command.password()
        );

        memberRepository.save(member);
    }
}
