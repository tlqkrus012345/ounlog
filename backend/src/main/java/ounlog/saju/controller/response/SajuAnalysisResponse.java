package ounlog.saju.controller.response;

import ounlog.saju.service.result.SajuAnalysisCreateResult;
import ounlog.saju.service.result.SajuAnalysisResult;

public record SajuAnalysisResponse(String result) {

    public static SajuAnalysisResponse from(SajuAnalysisCreateResult result) {
        return new SajuAnalysisResponse(result.result());
    }

    public static SajuAnalysisResponse from(SajuAnalysisResult result) {
        return new SajuAnalysisResponse(result.result());
    }
}
