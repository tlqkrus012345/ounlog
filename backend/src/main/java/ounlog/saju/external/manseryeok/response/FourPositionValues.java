package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

public record FourPositionValues(
        @NotNull @Valid StemBranchValue year,
        @NotNull @Valid StemBranchValue month,
        @NotNull @Valid StemBranchValue day,
        @NotNull @Valid StemBranchValue hour) {}
