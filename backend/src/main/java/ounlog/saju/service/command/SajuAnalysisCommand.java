package ounlog.saju.service.command;

import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;

public record SajuAnalysisCommand(LocalDate birthDate, LocalTime birthTime, CalendarType calendarType) {}
