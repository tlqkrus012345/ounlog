package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mockito;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.ChatModel;
import org.springframework.ai.chat.model.ChatResponse;
import org.springframework.ai.chat.model.Generation;
import org.springframework.ai.chat.prompt.ChatOptions;
import org.springframework.ai.chat.prompt.Prompt;
import org.springframework.core.io.ClassPathResource;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.SpringAiSajuAnalysisGenerator;
import ounlog.saju.external.ai.AiSajuAnalysisRequestMapper;
import ounlog.saju.external.ai.AiSajuAnalysisResponseValidator;
import ounlog.saju.external.ai.SajuInterpretationMapper;

class SpringAiSajuAnalysisGeneratorTest {
    ValidatorFactory factory;
    ChatModel model;
    SpringAiSajuAnalysisGenerator generator;

    @BeforeEach
    void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        model = Mockito.mock(ChatModel.class);
        given(model.getOptions()).willReturn(ChatOptions.builder().build());
        generator = new SpringAiSajuAnalysisGenerator(
                ChatClient.builder(model).build(),
                new ClassPathResource("prompts/saju-analysis-v1.st"),
                new AiSajuAnalysisRequestMapper(),
                new AiSajuAnalysisResponseValidator(factory.getValidator(), SajuTestFixtures.JSON),
                SajuTestFixtures.JSON,
                new SajuInterpretationMapper());
    }

    @AfterEach
    void tearDown() {
        factory.close();
    }

    @DisplayName("계산값으로 프롬프트를 구성하고 검증한 내부 해석 객체를 반환한다.")
    @Test
    void rendersCalculatedDataAndReturnsValidatedJson() {
        respond(SajuTestFixtures.JSON.writeValueAsString(SajuTestFixtures.analysisResponse()));

        SajuInterpretation result = generator.generate(SajuTestFixtures.calculationResult());

        tools.jackson.databind.JsonNode resultTree = SajuTestFixtures.JSON.valueToTree(result);
        assertThat(resultTree).isEqualTo(SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.analysisResponse()));
        ArgumentCaptor<Prompt> captor = ArgumentCaptor.forClass(Prompt.class);
        then(model).should().call(captor.capture());
        String prompt = captor.getValue().getInstructions().stream()
                .map(message -> message.getText())
                .reduce("", (left, right) -> left + right);
        assertThat(prompt).contains("\"currentAge\":33", "\"nextLuck\"", "\"annualLuck\"", "7개 문단");
        assertThat(prompt).doesNotContain("{analysisRequest}", "solarBirthDate", "totalValid");
    }

    @DisplayName("해석 문단이 누락된 AI 응답을 거부한다.")
    @Test
    void rejectsMissingParagraph() {
        tools.jackson.databind.node.ObjectNode root = (tools.jackson.databind.node.ObjectNode)
                SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.analysisResponse());
        root.remove("career");
        respond(root.toString());
        assertGenerationFailure();
    }

    @DisplayName("요청과 스키마 버전이 다른 AI 응답을 거부한다.")
    @Test
    void rejectsWrongSchemaVersion() {
        tools.jackson.databind.node.ObjectNode root = (tools.jackson.databind.node.ObjectNode)
                SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.analysisResponse());
        root.put("schemaVersion", "1");
        respond(root.toString());
        assertGenerationFailure();
    }

    @DisplayName("입력에 존재하지 않는 해석 근거를 거부한다.")
    @Test
    void rejectsFabricatedEvidence() {
        String json = SajuTestFixtures.JSON.writeValueAsString(SajuTestFixtures.analysisResponse());
        respond(json.replace("pillars.day.heavenlyStem", "pillars.day.missing"));
        assertGenerationFailure();
    }

    @DisplayName("실제 입력값과 다른 해석 근거를 거부한다.")
    @Test
    void rejectsWrongEvidenceValue() {
        String json = SajuTestFixtures.JSON.writeValueAsString(SajuTestFixtures.analysisResponse());
        respond(json.replace("\"value\":\"계\"", "\"value\":\"갑\""));
        assertGenerationFailure();
    }

    @DisplayName("잘못된 AI 출력 JSON을 해석 실패로 처리한다.")
    @Test
    void rejectsMalformedModelOutput() {
        respond("not-json");
        assertGenerationFailure();
    }

    @DisplayName("모델 호출 예외를 해석 실패로 변환한다.")
    @Test
    void convertsModelFailure() {
        given(model.call(any(Prompt.class))).willThrow(new IllegalStateException("simulated provider failure"));
        assertGenerationFailure();
    }

    private void respond(String content) {
        given(model.call(any(Prompt.class)))
                .willReturn(new ChatResponse(List.of(new Generation(new AssistantMessage(content)))));
    }

    private void assertGenerationFailure() {
        assertThatThrownBy(() -> generator.generate(SajuTestFixtures.calculationResult()))
                .isInstanceOf(SajuException.class)
                .hasFieldOrPropertyWithValue("errorCode", SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED);
    }
}
