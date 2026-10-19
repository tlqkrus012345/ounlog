package ounlog.saju.service.result;

import java.time.LocalDate;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.service.SajuAnalysisStatus;

public record SajuAnalysisCreateResult(
        SajuAnalysisStatus sajuAnalysisStatus, SajuInterpretation result, String legacyResult, LocalDate asOfDate) {

    public static SajuAnalysisCreateResult from(SajuAnalysisStatus status, SajuAnalysis analysis) {
        SajuAnalysisResult result = SajuAnalysisResult.from(analysis);
        return new SajuAnalysisCreateResult(status, result.result(), result.legacyResult(), result.asOfDate());
    }
}
