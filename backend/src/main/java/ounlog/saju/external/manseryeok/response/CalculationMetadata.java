package ounlog.saju.external.manseryeok.response;

import jakarta.validation.constraints.NotBlank;

/** 동일 입력의 계산 결과를 재현하기 위한 엔진 버전과 계산 정책. */
public record CalculationMetadata(
        @NotBlank String engine,
        @NotBlank String version,
        @NotBlank String timeZone,
        @NotBlank String dayBoundary,
        @NotBlank String ageBasis,
        @NotBlank String elementCountMethod) {}
