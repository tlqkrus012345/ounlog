package ounlog.saju.controller.request;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.service.command.SajuPreviewCommand;

public record SajuPreviewRequest(
        @NotNull LocalDate birthDate,
        @NotNull LocalTime birthTime,
        @NotNull CalendarType calendarType,
        @NotNull Gender gender,
        @NotNull Boolean isLeapMonth) {
    public SajuPreviewCommand toCommand() {
        return new SajuPreviewCommand(birthDate, birthTime, calendarType, gender, isLeapMonth);
    }

    @AssertTrue(message = "양력은 윤달일 수 없습니다.")
    public boolean isLeapMonthValid() {
        return calendarType == null || isLeapMonth == null || calendarType == CalendarType.LUNAR || !isLeapMonth;
    }
}
