package ounlog.saju.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.repository.SajuAnalysisRepository;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.command.SajuPreviewCommand;
import ounlog.saju.service.result.SajuAnalysisResult;
import ounlog.saju.service.result.SajuPreviewResult;

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class SajuService {

    private final SajuAnalysisRepository sajuAnalysisRepository;
    private final SajuAnalysisGenerator sajuAnalysisGenerator;

    public SajuPreviewResult preview(SajuPreviewCommand command) {
        return new SajuPreviewResult("키워드", "요약 내용");
    }

    @Transactional
    public SajuAnalysisResult sajuAnalysis(SajuAnalysisCommand command, Long memberId) {
        SajuAnalysisResult sajuAnalysisResult = sajuAnalysisGenerator.generate(command);

        SajuAnalysis sajuAnalysis = SajuAnalysis.create(
                memberId,
                command.birthDate(),
                command.birthTime(),
                command.calendarType(),
                sajuAnalysisResult.result());

        sajuAnalysisRepository.save(sajuAnalysis);

        return sajuAnalysisResult;
    }
}
