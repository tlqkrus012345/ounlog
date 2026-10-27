package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** 다음 대운. 첫 대운 시작 전에는 첫 대운이며, 계산 목록을 벗어나면 null로 전달한다. */
public record NextLuckContext(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        int ageFrom,
        int ageTo,
        @NotNull @Valid Pillar pillar,
        @NotBlank String korean) {}
