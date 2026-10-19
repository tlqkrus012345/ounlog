package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import java.time.Instant;
import java.time.LocalDate;
import ounlog.saju.entity.Gender;

/** Node 서버가 계산한 해석 문맥. currentLuck과 nextLuck은 해당 대운이 없으면 null이다. */
public record CalculationContext(
        @NotNull Instant asOf,
        @NotNull LocalDate asOfDate,
        @NotNull LocalDate solarBirthDate,
        @NotNull Gender gender,
        @NotNull @PositiveOrZero Integer currentAge,
        @NotNull @Valid ElementCounts elementCounts,
        @NotNull @Valid AnnualLuckContext annualLuck,
        @Valid CurrentLuckContext currentLuck,
        @Valid NextLuckContext nextLuck) {}
