package ounlog.saju.external.manseryeok.response;

import jakarta.validation.constraints.NotBlank;

public record StemBranchValue(
        @NotBlank String stem, @NotBlank String branch) {}
