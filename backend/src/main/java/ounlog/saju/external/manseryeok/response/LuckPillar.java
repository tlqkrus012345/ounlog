package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record LuckPillar(
        int age, @NotNull @Valid Pillar pillar, @NotBlank String korean) {}
