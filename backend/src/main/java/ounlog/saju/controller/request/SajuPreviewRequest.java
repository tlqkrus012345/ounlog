package ounlog.saju.controller.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.service.SajuPreviewCommand;

public record SajuPreviewRequest(
        @NotNull LocalDate birthDate,
        LocalTime birthTime,
        @NotNull CalendarType calendarType) {
    public SajuPreviewCommand toCommand() {
        return new SajuPreviewCommand(birthDate, birthTime, calendarType);
    }
}
