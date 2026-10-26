package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.SajuCalculationSnapshotMapper;
import ounlog.saju.repository.SajuAnalysisRepository;
import ounlog.saju.service.SajuAnalysisGenerator;
import ounlog.saju.service.SajuAnalysisStatus;
import ounlog.saju.service.SajuCalculator;
import ounlog.saju.service.SajuPreviewGenerator;
import ounlog.saju.service.SajuService;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.command.SajuPreviewCommand;
import ounlog.saju.service.result.SajuAnalysisCreateResult;
import ounlog.saju.service.result.SajuPreviewResult;

@ExtendWith(MockitoExtension.class)
class SajuServiceTest {

    @Mock
    SajuAnalysisRepository sajuAnalysisRepository;

    @Mock
    SajuAnalysisGenerator sajuAnalysisGenerator;

    @Mock
    private SajuPreviewGenerator sajuPreviewGenerator;

    @Mock
    SajuCalculator sajuCalculator;

    @Spy
    SajuCalculationSnapshotMapper snapshotMapper = new SajuCalculationSnapshotMapper();

    @InjectMocks
    SajuService sajuService;

    @DisplayName("Preview는 출생 정보로 계산한 결과를 생성기에 전달하고 저장 없이 반환한다.")
    @Test
    void preview() {
        SajuPreviewCommand command = new SajuPreviewCommand(
                LocalDate.of(1998, 8, 21), LocalTime.of(14, 32), CalendarType.LUNAR, Gender.FEMALE, true);
        ManseryeokCalculationResult calculation = SajuTestFixtures.calculationResult();
        SajuPreviewResult expected = new SajuPreviewResult(2025, "선택과 집중", "올해는 중요한 목표에 집중해 보세요.");
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuPreviewGenerator.generate(calculation)).willReturn(expected);

        SajuPreviewResult result = sajuService.preview(command);

        assertThat(result).isSameAs(expected);
        then(sajuCalculator).should().calculate(command.toBirthInfo());
        then(sajuPreviewGenerator).should().generate(calculation);
        then(sajuAnalysisRepository).shouldHaveNoInteractions();
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
    }

    @DisplayName("Preview 계산에 실패하면 생성기를 호출하지 않고 계산 실패를 전파한다.")
    @Test
    void previewCalculationFailure() {
        SajuPreviewCommand command = new SajuPreviewCommand(
                LocalDate.of(1998, 8, 21), LocalTime.of(14, 32), CalendarType.SOLAR, Gender.FEMALE, false);
        SajuException failure = new SajuException(SajuErrorCode.SAJU_CALCULATION_FAILED);
        given(sajuCalculator.calculate(command.toBirthInfo())).willThrow(failure);

        assertThatThrownBy(() -> sajuService.preview(command)).isSameAs(failure);

        then(sajuPreviewGenerator).shouldHaveNoInteractions();
        then(sajuAnalysisRepository).shouldHaveNoInteractions();
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
    }

    @DisplayName("Preview 생성에 실패하면 저장 없이 해석 실패를 전파한다.")
    @Test
    void previewGenerationFailure() {
        SajuPreviewCommand command = new SajuPreviewCommand(
                LocalDate.of(1998, 8, 21), LocalTime.of(14, 32), CalendarType.SOLAR, Gender.FEMALE, false);
        ManseryeokCalculationResult calculation = SajuTestFixtures.calculationResult();
        SajuException failure = new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuPreviewGenerator.generate(calculation)).willThrow(failure);

        assertThatThrownBy(() -> sajuService.preview(command)).isSameAs(failure);

        then(sajuAnalysisRepository).shouldHaveNoInteractions();
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
    }

    @DisplayName("분석 결과가 없으면 새 결과를 생성한다.")
    @Test
    void createSajuAnalysis() {
        // given
        SajuAnalysisCommand command = command();
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.empty());
        var calculation = SajuTestFixtures.calculationResult();
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuAnalysisGenerator.generate(calculation)).willReturn(SajuTestFixtures.interpretation("새 운세 결과"));

        // when
        SajuAnalysisCreateResult result = sajuService.sajuAnalysis(command, 1L);

        // then
        then(sajuPreviewGenerator).shouldHaveNoInteractions();
        assertThat(result.result()).isEqualTo(SajuTestFixtures.interpretation("새 운세 결과"));
        assertThat(result.asOfDate()).isEqualTo(calculation.context().asOfDate());
        assertThat(result.legacyResult()).isNull();
        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.CREATED);
        then(sajuAnalysisRepository)
                .should()
                .saveAndFlush(argThat(analysis -> analysis.getGender() == Gender.MALE
                        && !analysis.isLeapMonth()
                        && analysis.getCalculationSnapshot().equals(SajuTestFixtures.calculationSnapshot())
                        && analysis.getInterpretation().equals(result.result())));
    }

    @DisplayName("분석 결과가 이미 있으면 생성하지 않고 기존 결과를 반환한다.")
    @Test
    void returnExistingSajuAnalysis() {
        // given
        SajuAnalysis existingAnalysis = analysis("기존 운세 결과");
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.of(existingAnalysis));

        // when
        SajuAnalysisCreateResult result = sajuService.sajuAnalysis(command(), 1L);

        // then
        assertThat(result.result()).isEqualTo(SajuTestFixtures.interpretation("기존 운세 결과"));
        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.EXISTING);
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
        then(sajuCalculator).shouldHaveNoInteractions();
        then(sajuAnalysisRepository).should(never()).saveAndFlush(any(SajuAnalysis.class));
    }

    @DisplayName("동시 생성으로 유니크 제약이 충돌하면 먼저 생성된 결과를 반환한다.")
    @Test
    void returnExistingSajuAnalysisAfterUniqueConstraintViolation() {
        // given
        SajuAnalysisCommand command = command();
        SajuAnalysis existingAnalysis = analysis("먼저 생성된 운세 결과");
        DataIntegrityViolationException exception = new DataIntegrityViolationException("duplicate member id");
        given(sajuAnalysisRepository.findByMemberId(1L))
                .willReturn(Optional.empty())
                .willReturn(Optional.of(existingAnalysis));
        var calculation = SajuTestFixtures.calculationResult();
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuAnalysisGenerator.generate(calculation)).willReturn(SajuTestFixtures.interpretation("중복 생성 결과"));
        given(sajuAnalysisRepository.saveAndFlush(any(SajuAnalysis.class))).willThrow(exception);

        // when
        SajuAnalysisCreateResult result = sajuService.sajuAnalysis(command, 1L);

        // then
        assertThat(result.result()).isEqualTo(SajuTestFixtures.interpretation("먼저 생성된 운세 결과"));
        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.EXISTING);
        then(sajuAnalysisRepository).should(times(2)).findByMemberId(1L);
    }

    @DisplayName("무결성 위반 후 기존 결과가 없으면 원래 예외를 다시 던진다.")
    @Test
    void rethrowDataIntegrityViolationWithoutExistingAnalysis() {
        // given
        SajuAnalysisCommand command = command();
        DataIntegrityViolationException exception =
                new DataIntegrityViolationException("unexpected constraint violation");
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.empty());
        var calculation = SajuTestFixtures.calculationResult();
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuAnalysisGenerator.generate(calculation)).willReturn(SajuTestFixtures.interpretation("새 운세 결과"));
        given(sajuAnalysisRepository.saveAndFlush(any(SajuAnalysis.class))).willThrow(exception);

        // when & then
        assertThatThrownBy(() -> sajuService.sajuAnalysis(command, 1L)).isSameAs(exception);
    }

    private SajuAnalysisCommand command() {
        return new SajuAnalysisCommand(
                LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, Gender.MALE, false);
    }

    @DisplayName("계산에 실패하면 AI 호출과 저장을 수행하지 않는다.")
    @Test
    void calculationFailureDoesNotGenerateOrSave() {
        SajuAnalysisCommand command = command();
        SajuException failure = new SajuException(SajuErrorCode.SAJU_CALCULATION_FAILED);
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.empty());
        given(sajuCalculator.calculate(command.toBirthInfo())).willThrow(failure);

        assertThatThrownBy(() -> sajuService.sajuAnalysis(command, 1L)).isSameAs(failure);

        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
        then(sajuAnalysisRepository).should(never()).saveAndFlush(any(SajuAnalysis.class));
    }

    @DisplayName("해석에 실패하면 결과를 저장하지 않는다.")
    @Test
    void generationFailureDoesNotSave() {
        SajuAnalysisCommand command = command();
        var calculation = SajuTestFixtures.calculationResult();
        SajuException failure = new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.empty());
        given(sajuCalculator.calculate(command.toBirthInfo())).willReturn(calculation);
        given(sajuAnalysisGenerator.generate(calculation)).willThrow(failure);

        assertThatThrownBy(() -> sajuService.sajuAnalysis(command, 1L)).isSameAs(failure);

        then(sajuAnalysisRepository).should(never()).saveAndFlush(any(SajuAnalysis.class));
    }

    @DisplayName("구형 결과도 재생성하지 않고 그대로 반환한다.")
    @Test
    void returnsLegacyAnalysisWithoutExternalCalls() {
        var legacy = mock(SajuAnalysis.class);
        given(legacy.getLegacyResult()).willReturn("기존 문자열 결과");
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.of(legacy));

        var result = sajuService.sajuAnalysis(command(), 1L);

        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.EXISTING);
        assertThat(result.result()).isNull();
        assertThat(result.legacyResult()).isEqualTo("기존 문자열 결과");
        assertThat(result.asOfDate()).isNull();
        then(sajuCalculator).shouldHaveNoInteractions();
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
        then(sajuAnalysisRepository).should(never()).saveAndFlush(any());
    }

    private SajuAnalysis analysis(String result) {
        return SajuAnalysis.create(
                1L,
                LocalDate.of(2026, 1, 1),
                LocalTime.of(10, 0),
                CalendarType.SOLAR,
                Gender.MALE,
                false,
                SajuTestFixtures.calculationSnapshot(),
                SajuTestFixtures.interpretation(result));
    }
}
