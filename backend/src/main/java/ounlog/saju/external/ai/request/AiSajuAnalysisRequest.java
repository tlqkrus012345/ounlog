package ounlog.saju.external.ai.request;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import ounlog.saju.entity.Gender;
import ounlog.saju.external.manseryeok.response.AnnualLuckContext;
import ounlog.saju.external.manseryeok.response.CurrentLuckContext;
import ounlog.saju.external.manseryeok.response.ElementCounts;
import ounlog.saju.external.manseryeok.response.FourPillars;
import ounlog.saju.external.manseryeok.response.FourPositionValues;
import ounlog.saju.external.manseryeok.response.NextLuckContext;

/** 서버가 계산한 값만 AI에 전달한다. 원본 생일은 전달하지 않는다. */
public record AiSajuAnalysisRequest(
        String schemaVersion,
        String language,
        Instant asOf,
        LocalDate asOfDate,
        Integer currentAge,
        Gender gender,
        FourPillars pillars,
        FourPositionValues elements,
        FourPositionValues yinYang,
        FourPositionValues tenGods,
        List<String> voidBranches,
        ElementCounts elementCounts,
        AnnualLuckContext annualLuck,
        CurrentLuckContext currentLuck,
        NextLuckContext nextLuck) {}
