package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.time.LocalDate;

/**
 * 서버가 선택한 입춘 기준 연운. year는 적용되는 사주 연도이며 tenGods는 출생 일간 기준이다.
 * 날짜는 Asia/Seoul 기준 표시용으로, 시작 입춘 시각과 다음 입춘 직전 시각이 속한 날짜다.
 * 연운 선택은 LocalDate가 아닌 절입 시각으로 판정한다.
 */
public record AnnualLuckContext(
        int year,
        @NotNull Instant startAt,
        @NotNull Instant endAtExclusive,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        @NotNull @Valid Pillar pillar,
        @NotNull @Valid StemBranchValue tenGods) {}
