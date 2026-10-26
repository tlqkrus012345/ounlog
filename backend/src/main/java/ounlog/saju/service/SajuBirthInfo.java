package ounlog.saju.service;

import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;

public record SajuBirthInfo(
        LocalDate birthDate, LocalTime birthTime, CalendarType calendarType, Gender gender, boolean isLeapMonth) {}
