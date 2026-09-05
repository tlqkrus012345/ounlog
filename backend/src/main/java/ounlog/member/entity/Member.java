package ounlog.member.entity;

import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Entity
@Getter
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public class Member {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long memberId;

    @Column(nullable = false, length = 255, unique = true)
    private String email;

    @Column(nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberStatus status;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    @Column(nullable = false)
    private Instant updatedAt;

    private Member(String email, String passwordHash, MemberStatus status, Instant time) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.status = status;
        this.createdAt = time;
        this.updatedAt = time;
    }

    public static Member signup(String email, String passwordHash) {
        return new Member(email, passwordHash, MemberStatus.ACTIVE, Instant.now());
    }
}
