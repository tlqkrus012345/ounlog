package ounlog.saju.controller.response;

import io.swagger.v3.oas.annotations.media.Schema;
import ounlog.saju.service.result.SajuPreviewResult;

public record SajuPreviewResponse(
        @Schema(description = "입춘 기준으로 적용되는 연운의 연도", example = "2026") int year,
        @Schema(description = "올해의 핵심 주제 하나", example = "선택과 집중") String keyword,
        @Schema(description = "출생 사주와 연운을 연결한 짧은 해석 2~3문장") String summary) {
    public static SajuPreviewResponse from(SajuPreviewResult result) {
        return new SajuPreviewResponse(result.year(), result.keyword(), result.summary());
    }
}
