package ounlog.saju.external.ai;

import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.stereotype.Component;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.request.AiSajuPreviewRequest;
import ounlog.saju.external.ai.response.AiSajuPreviewResponse;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.service.SajuPreviewGenerator;
import ounlog.saju.service.result.SajuPreviewResult;
import tools.jackson.databind.json.JsonMapper;

@Component
public class SpringAiSajuPreviewGenerator implements SajuPreviewGenerator {

    private final ChatClient chatClient;
    private final Resource promptResource;
    private final AiSajuPreviewRequestMapper requestMapper;
    private final AiSajuPreviewResponseValidator responseValidator;
    private final JsonMapper jsonMapper;

    public SpringAiSajuPreviewGenerator(
            @Qualifier("geminiChatClient") ChatClient chatClient,
            @Value("classpath:prompts/saju-preview-v1.st") Resource promptResource,
            AiSajuPreviewRequestMapper requestMapper,
            AiSajuPreviewResponseValidator responseValidator,
            JsonMapper jsonMapper) {
        this.chatClient = chatClient;
        this.promptResource = promptResource;
        this.requestMapper = requestMapper;
        this.responseValidator = responseValidator;
        this.jsonMapper = jsonMapper;
    }

    @Override
    public SajuPreviewResult generate(ManseryeokCalculationResult result) {
        try {
            AiSajuPreviewRequest request = requestMapper.map(result);
            int year = request.annualLuck().year();
            String input = jsonMapper.writeValueAsString(request);
            AiSajuPreviewResponse response = chatClient
                    .prompt()
                    .system(system -> system.text(promptResource).param("previewRequest", input))
                    .user("제공된 사주와 연운으로 올해의 핵심 키워드를 해석해 주세요.")
                    .call()
                    .entity(AiSajuPreviewResponse.class);
            responseValidator.validate(response);
            return new SajuPreviewResult(year, response.keyword(), response.summary());
        } catch (SajuException exception) {
            throw exception;
        } catch (RuntimeException exception) {
            throw new SajuException(SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED, exception);
        }
    }
}
