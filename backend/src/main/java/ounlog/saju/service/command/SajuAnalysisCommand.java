package ounlog.saju.service.command;

import java.time.LocalDate;
import java.time.LocalTime;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.service.SajuBirthInfo;

public record SajuAnalysisCommand(
        LocalDate birthDate, LocalTime birthTime, CalendarType calendarType, Gender gender, boolean isLeapMonth) {
    public SajuBirthInfo toBirthInfo() {
        return new SajuBirthInfo(birthDate, birthTime, calendarType, gender, isLeapMonth);
    }
}
