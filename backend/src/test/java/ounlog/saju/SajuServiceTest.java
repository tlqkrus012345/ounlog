package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;
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
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.repository.SajuAnalysisRepository;
import ounlog.saju.service.SajuAnalysisGenerator;
import ounlog.saju.service.SajuAnalysisStatus;
import ounlog.saju.service.SajuService;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.result.SajuAnalysisCreateResult;

@ExtendWith(MockitoExtension.class)
class SajuServiceTest {

    @Mock
    SajuAnalysisRepository sajuAnalysisRepository;

    @Mock
    SajuAnalysisGenerator sajuAnalysisGenerator;

    @InjectMocks
    SajuService sajuService;

    @DisplayName("분석 결과가 없으면 새 결과를 생성한다.")
    @Test
    void createSajuAnalysis() {
        // given
        SajuAnalysisCommand command = command();
        given(sajuAnalysisRepository.findByMemberId(1L)).willReturn(Optional.empty());
        given(sajuAnalysisGenerator.generate(command)).willReturn("새 운세 결과");

        // when
        SajuAnalysisCreateResult result = sajuService.sajuAnalysis(command, 1L);

        // then
        assertThat(result.result()).isEqualTo("새 운세 결과");
        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.CREATED);
        then(sajuAnalysisRepository).should().saveAndFlush(any(SajuAnalysis.class));
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
        assertThat(result.result()).isEqualTo("기존 운세 결과");
        assertThat(result.sajuAnalysisStatus()).isEqualTo(SajuAnalysisStatus.EXISTING);
        then(sajuAnalysisGenerator).shouldHaveNoInteractions();
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
        given(sajuAnalysisGenerator.generate(command)).willReturn("중복 생성 결과");
        given(sajuAnalysisRepository.saveAndFlush(any(SajuAnalysis.class))).willThrow(exception);

        // when
        SajuAnalysisCreateResult result = sajuService.sajuAnalysis(command, 1L);

        // then
        assertThat(result.result()).isEqualTo("먼저 생성된 운세 결과");
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
        given(sajuAnalysisGenerator.generate(command)).willReturn("새 운세 결과");
        given(sajuAnalysisRepository.saveAndFlush(any(SajuAnalysis.class))).willThrow(exception);

        // when & then
        assertThatThrownBy(() -> sajuService.sajuAnalysis(command, 1L)).isSameAs(exception);
    }

    private SajuAnalysisCommand command() {
        return new SajuAnalysisCommand(LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR);
    }

    private SajuAnalysis analysis(String result) {
        return SajuAnalysis.create(1L, LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, result);
    }
}
