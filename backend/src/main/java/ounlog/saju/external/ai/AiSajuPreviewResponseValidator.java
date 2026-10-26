package ounlog.saju.external.ai;

import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.response.AiSajuPreviewResponse;

@Component
@RequiredArgsConstructor
public class AiSajuPreviewResponseValidator {

    private final Validator validator;

    public void validate(AiSajuPreviewResponse response) {
        if (response == null || !validator.validate(response).isEmpty()) {
            throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
        }
    }
}
