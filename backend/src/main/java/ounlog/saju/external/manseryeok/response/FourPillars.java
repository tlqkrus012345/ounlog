package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record FourPillars(
        @NotNull @Valid Pillar year,
        @NotNull @Valid Pillar month,
        @NotNull @Valid Pillar day,
        @NotNull @Valid Pillar hour) {}
