package ounlog.saju.external.manseryeok;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.external.manseryeok.request.ManseryeokCalculationRequest;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import ounlog.saju.service.SajuCalculator;
import ounlog.saju.service.command.SajuAnalysisCommand;

@RequiredArgsConstructor
@Component
public class ManseryeokCalculator implements SajuCalculator {

    private final ManseryeokClient manseryeokClient;
    private final Clock clock;

    @Override
    public ManseryeokCalculationResult calculate(SajuAnalysisCommand command) {
        LocalDate birthDate = command.birthDate();
        LocalTime birthTime = command.birthTime();

        Instant asOf = clock.instant();

        String gender =
                switch (command.gender()) {
                    case MALE -> "male";
                    case FEMALE -> "female";
                };

        ManseryeokCalculationRequest request = ManseryeokCalculationRequest.builder()
                .year(birthDate.getYear())
                .month(birthDate.getMonthValue())
                .day(birthDate.getDayOfMonth())
                .hour(birthTime.getHour())
                .minute(birthTime.getMinute())
                .isLunar(command.calendarType() == CalendarType.LUNAR)
                .isLeapMonth(command.isLeapMonth())
                .gender(gender)
                .dayBoundary("midnight")
                .asOf(asOf)
                .build();

        ManseryeokCalculationResponse response = manseryeokClient.calculate(request);

        return ManseryeokCalculationResult.from(response);
    }
}
