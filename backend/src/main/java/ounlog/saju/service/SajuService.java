package ounlog.saju.service;

import java.util.Optional;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.SajuCalculationSnapshotMapper;
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
    private final SajuCalculator sajuCalculator;
    private final SajuCalculationSnapshotMapper snapshotMapper;

    public SajuPreviewResult preview(SajuPreviewCommand command) {
        return new SajuPreviewResult(2026, "키워드", "요약 내용");
    }

    public SajuAnalysisCreateResult sajuAnalysis(SajuAnalysisCommand command, Long memberId) {
        Optional<SajuAnalysis> existing = sajuAnalysisRepository.findByMemberId(memberId);

        if (existing.isPresent()) {
            return SajuAnalysisCreateResult.from(SajuAnalysisStatus.EXISTING, existing.get());
        }

        ManseryeokCalculationResult manseryeokCalculationResult = sajuCalculator.calculate(command.toBirthInfo());

        SajuInterpretation sajuAnalysisResult = sajuAnalysisGenerator.generate(manseryeokCalculationResult);
        SajuAnalysis sajuAnalysis = SajuAnalysis.create(
                memberId,
                command.birthDate(),
                command.birthTime(),
                command.calendarType(),
                command.gender(),
                command.isLeapMonth(),
                snapshotMapper.map(manseryeokCalculationResult),
                sajuAnalysisResult);
        try {
            sajuAnalysisRepository.saveAndFlush(sajuAnalysis);
            return SajuAnalysisCreateResult.from(SajuAnalysisStatus.CREATED, sajuAnalysis);
        } catch (DataIntegrityViolationException exception) {
            return sajuAnalysisRepository
                    .findByMemberId(memberId)
                    .map(analysis -> SajuAnalysisCreateResult.from(SajuAnalysisStatus.EXISTING, analysis))
                    .orElseThrow(() -> exception);
        }
    }

    @Transactional(readOnly = true)
    public SajuAnalysisResult getSajuAnalysis(Long memberId) {
        SajuAnalysis sajuAnalysis = sajuAnalysisRepository
                .findByMemberId(memberId)
                .orElseThrow(() -> new SajuException(SajuErrorCode.SAJU_ANALYSIS_NOT_FOUND));

        return SajuAnalysisResult.from(sajuAnalysis);
    }
}
