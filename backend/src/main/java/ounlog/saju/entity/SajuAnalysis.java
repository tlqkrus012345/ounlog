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
import ounlog.saju.CalendarType;

@Entity
@Table(name = "saju_analysis")
@Getter
@RequiredArgsConstructor(access = AccessLevel.PROTECTED)
public class SajuAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long analysisId;

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
}
