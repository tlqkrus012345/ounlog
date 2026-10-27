package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** 서버가 세부 대운수로 선택한 현재 대운. 기간은 양 끝 날짜를 포함하고 나이는 만 나이다. */
public record CurrentLuckContext(
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate,
        int ageFrom,
        int ageTo,
        @NotNull @Valid Pillar pillar,
        @NotBlank String korean) {}
