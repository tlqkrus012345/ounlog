package ounlog.saju.external.manseryeok.response;

import jakarta.validation.constraints.NotBlank;

public record Pillar(
        @NotBlank String heavenlyStem, @NotBlank String earthlyBranch) {}
