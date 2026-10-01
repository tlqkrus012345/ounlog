package ounlog.saju.controller.response;

import ounlog.saju.service.result.SajuPreviewResult;

public record SajuPreviewResponse(String keyword, String summary) {
    public static SajuPreviewResponse from(SajuPreviewResult result) {
        return new SajuPreviewResponse(result.keyword(), result.summary());
    }
}
