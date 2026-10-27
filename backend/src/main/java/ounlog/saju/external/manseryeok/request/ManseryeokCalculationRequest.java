package ounlog.saju.external.manseryeok.request;

import java.time.Instant;
import lombok.Builder;

/** Spring이 기준 시각을 고정해 Node에 전달하는 계산 요청.*/
@Builder
public record ManseryeokCalculationRequest(
        int year,
        int month,
        int day,
        int hour,
        int minute,
        boolean isLunar,
        boolean isLeapMonth,
        String gender,
        String dayBoundary,
        Instant asOf) {}
