package ounlog.saju.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

@Entity
@Table(name = "saju_analysis")
@Getter
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public class SajuAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sajuAnalysisId;

    @Column(nullable = false)
    private Long memberId;

    @Column(nullable = false)
    private LocalDate birthDate;

    private LocalTime birthTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CalendarType calendarType;

    @Lob
    @Column(nullable = false, columnDefinition = "LONGTEXT")
    private String result;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private SajuAnalysis(
            Long memberId,
            LocalDate birthDate,
            LocalTime birthTime,
            CalendarType calendarType,
            String result,
            Instant createdAt) {
        this.memberId = memberId;
        this.birthDate = birthDate;
        this.birthTime = birthTime;
        this.calendarType = calendarType;
        this.result = result;
        this.createdAt = createdAt;
    }

    public static SajuAnalysis create(
            Long memberId, LocalDate birthDate, LocalTime birthTime, CalendarType calendarType, String result) {
        return new SajuAnalysis(memberId, birthDate, birthTime, calendarType, result, Instant.now());
    }
}
