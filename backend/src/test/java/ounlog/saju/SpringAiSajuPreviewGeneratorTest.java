package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.BDDMockito.given;
import static org.mockito.BDDMockito.then;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.util.List;
import java.util.stream.Stream;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
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
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.ai.AiSajuPreviewRequestMapper;
import ounlog.saju.external.ai.AiSajuPreviewResponseValidator;
import ounlog.saju.external.ai.SpringAiSajuPreviewGenerator;
import ounlog.saju.external.ai.response.AiSajuPreviewResponse;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import ounlog.saju.service.result.SajuPreviewResult;
import tools.jackson.databind.node.ObjectNode;

class SpringAiSajuPreviewGeneratorTest {

    private ValidatorFactory factory;
    private ChatModel model;
    private SpringAiSajuPreviewGenerator generator;

    @BeforeEach
    void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        model = Mockito.mock(ChatModel.class);
        given(model.getOptions()).willReturn(ChatOptions.builder().build());
        generator = new SpringAiSajuPreviewGenerator(
                ChatClient.builder(model).build(),
                new ClassPathResource("prompts/saju-preview-v1.st"),
                new AiSajuPreviewRequestMapper(),
                new AiSajuPreviewResponseValidator(factory.getValidator()),
                SajuTestFixtures.JSON);
    }

    @AfterEach
    void tearDown() {
        factory.close();
    }

    @DisplayName("Preview 계산 데이터를 프롬프트에 전달하고 연운의 연도로 결과를 구성한다.")
    @Test
    void rendersPreviewDataAndUsesCalculatedYear() {
        respond(SajuTestFixtures.JSON.writeValueAsString(
                new AiSajuPreviewResponse("선택과 집중", "중요한 목표에 집중해 보세요.")));
        ObjectNode source = SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.calculationResponse());
        ((ObjectNode) source.get("context").get("annualLuck")).put("year", 2025);
        ManseryeokCalculationResult calculation = ManseryeokCalculationResult.from(
                SajuTestFixtures.JSON.treeToValue(source, ManseryeokCalculationResponse.class));

        SajuPreviewResult result = generator.generate(calculation);

        assertThat(result).isEqualTo(new SajuPreviewResult(2025, "선택과 집중", "중요한 목표에 집중해 보세요."));
        ArgumentCaptor<Prompt> captor = ArgumentCaptor.forClass(Prompt.class);
        then(model).should().call(captor.capture());
        String prompt = captor.getValue().getInstructions().stream()
                .map(message -> message.getText())
                .reduce("", (left, right) -> left + right);
        String input =
                SajuTestFixtures.JSON.writeValueAsString(new AiSajuPreviewRequestMapper().map(calculation));
        assertThat(prompt).contains(input, "20자 이내", "300자 이내", "2~3문장");
        assertThat(prompt).doesNotContain("{previewRequest}", "solarBirthDate", "birthTime", "currentLuck", "nextLuck");
    }

    @DisplayName("필수 필드 누락, 공백과 길이 제한을 위반한 AI 응답을 거부한다.")
    @ParameterizedTest
    @MethodSource("invalidResponses")
    void rejectsInvalidResponse(AiSajuPreviewResponse response) {
        respond(SajuTestFixtures.JSON.writeValueAsString(response));

        assertGenerationFailure();
    }

    static Stream<AiSajuPreviewResponse> invalidResponses() {
        return Stream.of(
                null,
                new AiSajuPreviewResponse(null, "요약"),
                new AiSajuPreviewResponse("키워드", null),
                new AiSajuPreviewResponse("  ", "요약"),
                new AiSajuPreviewResponse("키워드", "\n\t"),
                new AiSajuPreviewResponse("가".repeat(21), "요약"),
                new AiSajuPreviewResponse("키워드", "가".repeat(301)));
    }

    @DisplayName("허용된 최대 길이의 AI 응답을 반환한다.")
    @Test
    void acceptsMaximumLengths() {
        respond(SajuTestFixtures.JSON.writeValueAsString(
                new AiSajuPreviewResponse("가".repeat(20), "나".repeat(300))));

        SajuPreviewResult result = generator.generate(SajuTestFixtures.calculationResult());

        assertThat(result.keyword()).hasSize(20);
        assertThat(result.summary()).hasSize(300);
    }

    @DisplayName("잘못된 AI 출력 JSON을 해석 실패로 처리한다.")
    @Test
    void rejectsMalformedModelOutput() {
        respond("not-json");

        assertGenerationFailure();
    }

    @DisplayName("모델 호출 예외를 원인을 보존한 해석 실패로 변환한다.")
    @Test
    void convertsModelFailure() {
        IllegalStateException failure = new IllegalStateException("simulated provider failure");
        given(model.call(any(Prompt.class))).willThrow(failure);

        assertThatThrownBy(() -> generator.generate(SajuTestFixtures.calculationResult()))
                .isInstanceOf(SajuException.class)
                .hasFieldOrPropertyWithValue("errorCode", SajuErrorCode.SAJU_ANALYSIS_GENERATION_FAILED)
                .hasCause(failure);
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
