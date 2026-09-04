package ounlog.saju.service;

import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.CalendarType;

public record SajuPreviewCommand(LocalDate birthDate, LocalTime birthTime, CalendarType calendarType) {}
