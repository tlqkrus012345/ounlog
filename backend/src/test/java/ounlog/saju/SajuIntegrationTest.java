package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import ounlog.config.MysqlTestContainerConfig;
import ounlog.saju.entity.CalendarType;
import ounlog.saju.entity.Gender;
import ounlog.saju.repository.SajuAnalysisRepository;
import ounlog.saju.service.SajuAnalysisGenerator;
import ounlog.saju.service.SajuAnalysisStatus;
import ounlog.saju.service.SajuCalculator;
import ounlog.saju.service.SajuService;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.result.SajuAnalysisCreateResult;

@Import(MysqlTestContainerConfig.class)
@SpringBootTest
class SajuIntegrationTest {

    @Autowired
    SajuService sajuService;

    @Autowired
    SajuAnalysisRepository sajuAnalysisRepository;

    @MockitoBean
    SajuCalculator sajuCalculator;

    @MockitoBean
    SajuAnalysisGenerator sajuAnalysisGenerator;

    @DisplayName("동시에 사주 분석을 요청하면 하나는 생성되고 나머지는 기존 결과를 반환한다.")
    @Test
    void sajuAnalysisWithConcurrentRequests() throws Exception {
        // given
        int threadCount = 2;
        ExecutorService executorService = Executors.newFixedThreadPool(threadCount);
        CountDownLatch readyLatch = new CountDownLatch(threadCount);
        CountDownLatch startLatch = new CountDownLatch(1);

        SajuAnalysisCommand command = new SajuAnalysisCommand(
                LocalDate.of(2026, 1, 1), LocalTime.of(10, 0), CalendarType.SOLAR, Gender.MALE, false);

        given(sajuCalculator.calculate(command.toBirthInfo())).willAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive())
                    .isFalse();
            return SajuTestFixtures.calculationResult();
        });
        given(sajuAnalysisGenerator.generate(any())).willAnswer(invocation -> {
            assertThat(TransactionSynchronizationManager.isActualTransactionActive())
                    .isFalse();
            return SajuTestFixtures.interpretation("동시 생성 테스트 결과");
        });

        List<Future<SajuAnalysisCreateResult>> futures = new ArrayList<>();
        // when
        for (int i = 0; i < threadCount; i++) {
            futures.add(executorService.submit(() -> {
                readyLatch.countDown();
                startLatch.await();
                return sajuService.sajuAnalysis(command, 1L);
            }));
        }

        readyLatch.await();
        startLatch.countDown();

        List<SajuAnalysisCreateResult> results = new ArrayList<>();
        for (Future<SajuAnalysisCreateResult> future : futures) {
            results.add(future.get());
        }

        executorService.shutdown();

        // then
        assertThat(sajuAnalysisRepository.findAll()).hasSize(1);
        var saved = sajuAnalysisRepository.findByMemberId(1L).orElseThrow();
        assertThat(saved.getCalculationSnapshot()).isEqualTo(SajuTestFixtures.calculationSnapshot());
        assertThat(saved.getInterpretation()).isEqualTo(SajuTestFixtures.interpretation("동시 생성 테스트 결과"));
        assertThat(results)
                .extracting(SajuAnalysisCreateResult::sajuAnalysisStatus)
                .containsExactlyInAnyOrder(SajuAnalysisStatus.CREATED, SajuAnalysisStatus.EXISTING);
    }
}
