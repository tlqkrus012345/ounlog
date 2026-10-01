package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.repository.SajuAnalysisRepository;

@Import(MysqlTestContainerConfig.class)
@DataJpaTest
class SajuAnalysisRepositoryTest {

    @Autowired
    SajuAnalysisRepository sajuAnalysisRepository;

    @DisplayName("회원 ID로 사주 분석 결과를 조회한다.")
    @Test
    void findByMemberId() {
        // given
        sajuAnalysisRepository.save(
                SajuAnalysis.create(1L, LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, "사주 분석 결과"));

        // when
        Optional<SajuAnalysis> sajuAnalysis = sajuAnalysisRepository.findByMemberId(1L);

        // then
        SajuAnalysis result = sajuAnalysis.get();
        assertThat(result.getMemberId()).isEqualTo(1L);
        assertThat(result.getResult()).isEqualTo("사주 분석 결과");
    }

    @DisplayName("같은 회원 ID로 사주 분석 결과를 중복 저장하면 유니크 제약 예외가 발생한다.")
    @Test
    void saveWithDuplicatedMemberId() {
        // given
        sajuAnalysisRepository.saveAndFlush(
                SajuAnalysis.create(1L, LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, "첫 번째 결과"));

        SajuAnalysis duplicated =
                SajuAnalysis.create(1L, LocalDate.of(2026, 2, 1), LocalTime.of(11, 0), CalendarType.LUNAR, "두 번째 결과");

        // when & then
        assertThatThrownBy(() -> sajuAnalysisRepository.saveAndFlush(duplicated))
                .isInstanceOf(DataIntegrityViolationException.class);
    }
}
