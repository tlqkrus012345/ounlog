package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Optional;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.context.annotation.Import;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.JdbcTemplate;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.repository.SajuAnalysisRepository;

@Import(MysqlTestContainerConfig.class)
@DataJpaTest
class SajuAnalysisRepositoryTest {

    @Autowired
    SajuAnalysisRepository sajuAnalysisRepository;

    @Autowired
    EntityManager entityManager;

    @Autowired
    JdbcTemplate jdbcTemplate;

    @DisplayName("회원 ID로 사주 분석 결과를 조회한다.")
    @Test
    void findByMemberId() {
        // given
        sajuAnalysisRepository.save(SajuAnalysis.create(
                1L,
                LocalDate.of(2026, 1, 1),
                LocalTime.of(10, 0),
                CalendarType.LUNAR,
                Gender.FEMALE,
                true,
                SajuTestFixtures.calculationSnapshot(),
                SajuTestFixtures.interpretation("사주 분석 결과")));

        entityManager.flush();
        entityManager.clear();

        // when
        Optional<SajuAnalysis> sajuAnalysis = sajuAnalysisRepository.findByMemberId(1L);

        // then
        SajuAnalysis result = sajuAnalysis.get();
        assertThat(result.getMemberId()).isEqualTo(1L);
        assertThat(result.getGender()).isEqualTo(Gender.FEMALE);
        assertThat(result.isLeapMonth()).isTrue();
        assertThat(result.getInterpretation()).isEqualTo(SajuTestFixtures.interpretation("사주 분석 결과"));
        assertThat(result.getCalculationSnapshot()).isEqualTo(SajuTestFixtures.calculationSnapshot());
        assertThat(result.getLegacyResult()).isNull();
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT JSON_TYPE(calculation_snapshot) FROM saju_analysis WHERE member_id = 1", String.class))
                .isEqualTo("OBJECT");
        assertThat(jdbcTemplate.queryForObject(
                        "SELECT JSON_TYPE(interpretation) FROM saju_analysis WHERE member_id = 1", String.class))
                .isEqualTo("OBJECT");
    }

    @DisplayName("같은 회원 ID로 사주 분석 결과를 중복 저장하면 유니크 제약 예외가 발생한다.")
    @Test
    void saveWithDuplicatedMemberId() {
        // given
        sajuAnalysisRepository.saveAndFlush(SajuAnalysis.create(
                1L,
                LocalDate.of(2026, 1, 1),
                LocalTime.of(10, 0),
                CalendarType.SOLAR,
                Gender.MALE,
                false,
                SajuTestFixtures.calculationSnapshot(),
                SajuTestFixtures.interpretation("첫 번째 결과")));

        SajuAnalysis duplicated = SajuAnalysis.create(
                1L,
                LocalDate.of(2026, 2, 1),
                LocalTime.of(11, 0),
                CalendarType.LUNAR,
                Gender.FEMALE,
                true,
                SajuTestFixtures.calculationSnapshot(),
                SajuTestFixtures.interpretation("두 번째 결과"));

        // when & then
        assertThatThrownBy(() -> sajuAnalysisRepository.saveAndFlush(duplicated))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @DisplayName("마이그레이션 이전의 일반 문자열 결과를 손실 없이 조회한다.")
    @Test
    void readsLegacyResultWithoutFabricatingSnapshot() {
        jdbcTemplate.update("""
                INSERT INTO saju_analysis
                    (member_id, birth_date, birth_time, calendar_type, gender, is_leap_month, result, created_at)
                VALUES (2, '1992-10-24', '05:30:00', 'SOLAR', 'MALE', false, ?, CURRENT_TIMESTAMP(6))
                """, "기존 일반 문자열 분석 결과");

        var saved = sajuAnalysisRepository.findByMemberId(2L).orElseThrow();

        assertThat(saved.getLegacyResult()).isEqualTo("기존 일반 문자열 분석 결과");
        assertThat(saved.getCalculationSnapshot()).isNull();
        assertThat(saved.getInterpretation()).isNull();
    }
}
