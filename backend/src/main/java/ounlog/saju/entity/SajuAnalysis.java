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
import java.util.Objects;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "saju_analysis")
@Getter
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public class SajuAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long sajuAnalysisId;

    @Column(nullable = false, unique = true)
    private Long memberId;

    @Column(nullable = false)
    private LocalDate birthDate;

    @Column(nullable = false)
    private LocalTime birthTime;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CalendarType calendarType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10)
    private Gender gender;

    @Column(nullable = false)
    private boolean isLeapMonth;

    @Lob
    @Column(name = "result", columnDefinition = "LONGTEXT")
    private String legacyResult;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSON")
    private SajuCalculationSnapshot calculationSnapshot;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "JSON")
    private SajuInterpretation interpretation;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private SajuAnalysis(
            Long memberId,
            LocalDate birthDate,
            LocalTime birthTime,
            CalendarType calendarType,
            Gender gender,
            boolean isLeapMonth,
            SajuCalculationSnapshot calculationSnapshot,
            SajuInterpretation interpretation,
            Instant createdAt) {
        this.memberId = memberId;
        this.birthDate = birthDate;
        this.birthTime = birthTime;
        this.calendarType = calendarType;
        this.gender = gender;
        this.isLeapMonth = isLeapMonth;
        this.calculationSnapshot = Objects.requireNonNull(calculationSnapshot);
        this.interpretation = Objects.requireNonNull(interpretation);
        this.createdAt = createdAt;
    }

    public static SajuAnalysis create(
            Long memberId,
            LocalDate birthDate,
            LocalTime birthTime,
            CalendarType calendarType,
            Gender gender,
            boolean isLeapMonth,
            SajuCalculationSnapshot calculationSnapshot,
            SajuInterpretation interpretation) {
        return new SajuAnalysis(
                memberId,
                birthDate,
                birthTime,
                calendarType,
                gender,
                isLeapMonth,
                calculationSnapshot,
                interpretation,
                Instant.now());
    }
}
