package ounlog.saju.external.ai.request;

import ounlog.saju.external.manseryeok.response.AnnualLuckContext;
import ounlog.saju.external.manseryeok.response.ElementCounts;
import ounlog.saju.external.manseryeok.response.FourPillars;

/** 올해의 핵심 키워드 해석에 필요한 계산값만 전달한다. 원본 생년월일과 출생시간은 포함하지 않는다. */
public record AiSajuPreviewRequest(FourPillars pillars, ElementCounts elementCounts, AnnualLuckContext annualLuck) {}
