package ounlog.saju.service;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.repository.SajuAnalysisRepository;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.command.SajuPreviewCommand;
import ounlog.saju.service.result.SajuAnalysisCreateResult;
import ounlog.saju.service.result.SajuAnalysisResult;
import ounlog.saju.service.result.SajuPreviewResult;

@Service
@RequiredArgsConstructor
public class SajuService {

    private final SajuAnalysisRepository sajuAnalysisRepository;
    private final SajuAnalysisGenerator sajuAnalysisGenerator;

    public SajuPreviewResult preview(SajuPreviewCommand command) {
        return new SajuPreviewResult("키워드", "요약 내용");
    }

    public SajuAnalysisCreateResult sajuAnalysis(SajuAnalysisCommand command, Long memberId) {
        Optional<SajuAnalysis> existing = sajuAnalysisRepository.findByMemberId(memberId);

        if (existing.isPresent()) {
            return new SajuAnalysisCreateResult(
                    SajuAnalysisStatus.EXISTING, existing.get().getResult());
        }

        String sajuAnalysisResult = sajuAnalysisGenerator.generate(command);
        SajuAnalysis sajuAnalysis = SajuAnalysis.create(
                memberId, command.birthDate(), command.birthTime(), command.calendarType(), sajuAnalysisResult);
        try {
            sajuAnalysisRepository.saveAndFlush(sajuAnalysis);
            return new SajuAnalysisCreateResult(SajuAnalysisStatus.CREATED, sajuAnalysisResult);
        } catch (DataIntegrityViolationException exception) {
            return sajuAnalysisRepository
                    .findByMemberId(memberId)
                    .map(analysis -> new SajuAnalysisCreateResult(SajuAnalysisStatus.EXISTING, analysis.getResult()))
                    .orElseThrow(() -> exception);
        }
    }

    @Transactional(readOnly = true)
    public SajuAnalysisResult getSajuAnalysis(Long memberId) {
        SajuAnalysis sajuAnalysis = sajuAnalysisRepository
                .findByMemberId(memberId)
                .orElseThrow(() -> new SajuException(SajuErrorCode.SAJU_ANALYSIS_NOT_FOUND));

        return new SajuAnalysisResult(sajuAnalysis.getResult());
    }
}
