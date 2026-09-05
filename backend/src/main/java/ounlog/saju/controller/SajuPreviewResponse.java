package ounlog.saju.controller;

import ounlog.saju.service.SajuPreviewResult;

public record SajuPreviewResponse(String keyword, String summary) {
    public static SajuPreviewResponse from(SajuPreviewResult result) {
        return new SajuPreviewResponse(result.keyword(), result.summary());
    }
}
