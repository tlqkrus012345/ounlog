package ounlog.saju.service.command;

import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;

public record SajuPreviewCommand(LocalDate birthDate, LocalTime birthTime, CalendarType calendarType) {}
