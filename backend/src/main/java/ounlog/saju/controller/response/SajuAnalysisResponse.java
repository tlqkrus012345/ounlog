package ounlog.saju.controller.response;

import ounlog.saju.service.result.SajuAnalysisResult;

public record SajuAnalysisResponse(String result) {

    public static SajuAnalysisResponse from(SajuAnalysisResult result) {
        return new SajuAnalysisResponse(result.result());
    }
}
