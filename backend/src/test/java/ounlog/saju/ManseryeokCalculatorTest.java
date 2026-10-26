package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.ManseryeokCalculator;
import ounlog.saju.external.manseryeok.ManseryeokClient;
import ounlog.saju.external.manseryeok.request.ManseryeokCalculationRequest;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import ounlog.saju.service.SajuBirthInfo;

class ManseryeokCalculatorTest {

    @DisplayName("양력 자정을 요청으로 변환하고 계산 문맥을 보존한다.")
    @Test
    void mapsSolarMidnightAndPreservesContext() {
        ManseryeokClient client = Mockito.mock(ManseryeokClient.class);
        ManseryeokCalculationResponse response = SajuTestFixtures.calculationResponse();
        given(client.calculate(any())).willReturn(response);
        Instant asOf = Instant.parse("2026-10-17T00:00:00Z");
        ManseryeokCalculator calculator = new ManseryeokCalculator(client, Clock.fixed(asOf, ZoneOffset.UTC));

        ManseryeokCalculationResult result = calculator.calculate(new SajuBirthInfo(
                LocalDate.of(1992, 10, 24), LocalTime.MIDNIGHT, CalendarType.SOLAR, Gender.MALE, false));

        ArgumentCaptor<ManseryeokCalculationRequest> captor = ArgumentCaptor.forClass(ManseryeokCalculationRequest.class);
        then(client).should().calculate(captor.capture());
        assertThat(captor.getValue())
                .isEqualTo(
                        new ManseryeokCalculationRequest(1992, 10, 24, 0, 0, false, false, "male", "midnight", asOf));
        assertThat(result.context()).isEqualTo(response.context());
        assertThat(result.metadata()).isEqualTo(response.metadata());
    }

    @DisplayName("음력 윤달과 여성 성별을 Node 계약으로 변환한다.")
    @Test
    void mapsLunarLeapMonthAndFemale() {
        ManseryeokClient client = Mockito.mock(ManseryeokClient.class);
        given(client.calculate(any())).willReturn(SajuTestFixtures.calculationResponse());
        Instant asOf = Instant.parse("2026-10-17T00:00:00Z");
        ManseryeokCalculator calculator = new ManseryeokCalculator(client, Clock.fixed(asOf, ZoneOffset.UTC));

        calculator.calculate(new SajuBirthInfo(
                LocalDate.of(2020, 4, 1), LocalTime.of(14, 30), CalendarType.LUNAR, Gender.FEMALE, true));

        then(client)
                .should()
                .calculate(
                        new ManseryeokCalculationRequest(2020, 4, 1, 14, 30, true, true, "female", "midnight", asOf));
    }
}
