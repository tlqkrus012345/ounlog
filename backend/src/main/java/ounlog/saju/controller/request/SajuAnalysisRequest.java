package ounlog.saju.controller.request;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.service.command.SajuAnalysisCommand;

public record SajuAnalysisRequest(
        @NotNull LocalDate birthDate,
        LocalTime birthTime,
        @NotNull CalendarType calendarType) {
    public SajuAnalysisCommand toCommand() {
        return new SajuAnalysisCommand(birthDate, birthTime, calendarType);
    }
}
