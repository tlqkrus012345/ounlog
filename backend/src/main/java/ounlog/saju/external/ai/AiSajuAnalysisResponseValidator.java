package ounlog.saju.external.ai;

import jakarta.validation.Validator;
import java.util.List;
import java.util.regex.Pattern;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.request.AiSajuAnalysisRequest;
import ounlog.saju.external.ai.response.AiSajuAnalysisResponse;
import ounlog.saju.external.ai.response.AnalysisEvidence;
import ounlog.saju.external.ai.response.AnalysisParagraph;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

@Component
@RequiredArgsConstructor
public class AiSajuAnalysisResponseValidator {

    private static final Pattern SOURCE_PATH =
            Pattern.compile("[A-Za-z][A-Za-z0-9]*(?:\\[\\d+\\])?(?:\\.[A-Za-z][A-Za-z0-9]*(?:\\[\\d+\\])?)*");

    private final Validator validator;
    private final JsonMapper jsonMapper;

    public void validate(AiSajuAnalysisRequest request, AiSajuAnalysisResponse response) {
        if (response == null
                || !validator.validate(response).isEmpty()
                || !request.schemaVersion().equals(response.schemaVersion())) {
            throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
        }
        JsonNode input = jsonMapper.valueToTree(request);
        List<AnalysisParagraph> paragraphs = List.of(
                response.fiveElements(),
                response.annualOverview(),
                response.personality(),
                response.career(),
                response.wealth(),
                response.relationship(),
                response.currentLuck());
        for (AnalysisParagraph paragraph : paragraphs) {
            for (AnalysisEvidence evidence : paragraph.evidence()) {
                if (!SOURCE_PATH.matcher(evidence.source()).matches()) {
                    throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
                }
                String pointer = "/"
                        + evidence.source().replaceAll("\\[(\\d+)\\]", "/$1").replace('.', '/');
                JsonNode value = input.at(pointer);
                if (value.isMissingNode()
                        || value.isNull()
                        || !value.isValueNode()
                        || !(value.isString() ? value.asString() : value.toString()).equals(evidence.value())) {
                    throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
                }
            }
        }
    }
}
