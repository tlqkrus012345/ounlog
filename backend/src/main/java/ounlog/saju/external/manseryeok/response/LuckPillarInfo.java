package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record LuckPillarInfo(
        boolean forward,
        int startAge,
        int startYears,
        int startMonths,
        int startDays,
        @NotNull List<@NotNull @Valid LuckPillar> pillars) {}
