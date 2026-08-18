package saju.member.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import saju.member.service.MemberService;
import saju.member.service.MemberSignupResult;

@RestController
@RequestMapping("/v1/members")
@RequiredArgsConstructor
public class MemberController implements MemberApi {

    private final MemberService memberService;

    @Override
    @PostMapping("/signup")
    public ResponseEntity<MemberSignupResponse> signup(@Valid @RequestBody MemberSignupRequest request) {
        MemberSignupResult result = memberService.signup(request.toCommand());
        return ResponseEntity.status(HttpStatus.CREATED).body(MemberSignupResponse.from(result));
    }
}
