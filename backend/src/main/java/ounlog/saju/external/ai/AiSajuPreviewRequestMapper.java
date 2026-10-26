package ounlog.saju.external.ai;

import org.springframework.stereotype.Component;
import ounlog.saju.external.ai.request.AiSajuPreviewRequest;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;

/** 만세력 계산값을 복사하며 출생 사주와 연운을 다시 계산하지 않는다. */
@Component
public class AiSajuPreviewRequestMapper {

    public AiSajuPreviewRequest map(ManseryeokCalculationResult result) {
        return new AiSajuPreviewRequest(
                result.pillars(), result.context().elementCounts(), result.context().annualLuck());
    }
}
