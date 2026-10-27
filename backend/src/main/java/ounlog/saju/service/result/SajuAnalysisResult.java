package ounlog.saju.service.result;

import java.time.LocalDate;
import ounlog.saju.entity.SajuAnalysis;
import ounlog.saju.entity.SajuCalculationSnapshot;
import ounlog.saju.entity.SajuInterpretation;

public record SajuAnalysisResult(SajuInterpretation result, String legacyResult, LocalDate asOfDate) {

    public static SajuAnalysisResult from(SajuAnalysis analysis) {
        SajuCalculationSnapshot snapshot = analysis.getCalculationSnapshot();
        return new SajuAnalysisResult(
                analysis.getInterpretation(),
                analysis.getLegacyResult(),
                snapshot == null ? null : snapshot.context().asOfDate());
    }
}
