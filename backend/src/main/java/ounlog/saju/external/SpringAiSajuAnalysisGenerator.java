package ounlog.saju.external;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.AiSajuAnalysisRequestMapper;
import ounlog.saju.external.ai.AiSajuAnalysisResponseValidator;
import ounlog.saju.external.ai.SajuInterpretationMapper;
import ounlog.saju.external.ai.request.AiSajuAnalysisRequest;
import ounlog.saju.external.ai.response.AiSajuAnalysisResponse;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.service.SajuAnalysisGenerator;
import tools.jackson.databind.json.JsonMapper;

@Component
public class SpringAiSajuAnalysisGenerator implements SajuAnalysisGenerator {

    private final ChatClient chatClient;
    private final Resource promptResource;
    private static final String REQUEST_TEXT = "다음 사주 데이터를 해석해 주세요.";
    private final AiSajuAnalysisRequestMapper aiSajuAnalysisRequestMapper;
    private final AiSajuAnalysisResponseValidator responseValidator;
    private final JsonMapper jsonMapper;
    private final SajuInterpretationMapper interpretationMapper;

    public SpringAiSajuAnalysisGenerator(
            ChatClient chatClient,
            @Value("classpath:prompts/saju-analysis-v1.st") Resource promptResource,
            AiSajuAnalysisRequestMapper aiSajuAnalysisRequestMapper,
            AiSajuAnalysisResponseValidator responseValidator,
            JsonMapper jsonMapper,
            SajuInterpretationMapper interpretationMapper) {
        this.chatClient = chatClient;
        this.promptResource = promptResource;
        this.aiSajuAnalysisRequestMapper = aiSajuAnalysisRequestMapper;
        this.responseValidator = responseValidator;
        this.jsonMapper = jsonMapper;
        this.interpretationMapper = interpretationMapper;
    }

    @Override
    public SajuInterpretation generate(ManseryeokCalculationResult result) {

        try {
            AiSajuAnalysisRequest request = aiSajuAnalysisRequestMapper.map(result);
            String input = jsonMapper.writeValueAsString(request);
            AiSajuAnalysisResponse response = chatClient
                    .prompt()
                    .system(system -> system.text(promptResource).param("analysisRequest", input))
                    .user(REQUEST_TEXT)
                    .call()
                    .entity(AiSajuAnalysisResponse.class);
            responseValidator.validate(request, response);
            return interpretationMapper.map(response);
        } catch (SajuException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED, exception);
        }
    }
}
