package ounlog.saju.external.ai;

import org.springframework.stereotype.Component;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.request.AiSajuAnalysisRequest;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.response.CalculationContext;

/** 계산값을 복사하며 원국, 나이와 운을 다시 계산하지 않는다. */
@Component
public class AiSajuAnalysisRequestMapper {

    public AiSajuAnalysisRequest map(ManseryeokCalculationResult result) {
        if (result == null || result.context() == null) {
            throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
        }
        CalculationContext context = result.context();
        return new AiSajuAnalysisRequest(
                "2",
                "ko",
                context.asOf(),
                context.asOfDate(),
                context.currentAge(),
                context.gender(),
                result.pillars(),
                result.elements(),
                result.yinYang(),
                result.tenGods(),
                result.voidBranches(),
                context.elementCounts(),
                context.annualLuck(),
                context.currentLuck(),
                context.nextLuck());
    }
}
