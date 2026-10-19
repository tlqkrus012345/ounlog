package ounlog.saju.controller.response;

import java.time.LocalDate;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.service.result.SajuAnalysisCreateResult;
import ounlog.saju.service.result.SajuAnalysisResult;

public record SajuAnalysisResponse(SajuInterpretation result, String legacyResult, LocalDate asOfDate) {

    public static SajuAnalysisResponse from(SajuAnalysisCreateResult result) {
        return new SajuAnalysisResponse(result.result(), result.legacyResult(), result.asOfDate());
    }

    public static SajuAnalysisResponse from(SajuAnalysisResult result) {
        return new SajuAnalysisResponse(result.result(), result.legacyResult(), result.asOfDate());
    }
}
