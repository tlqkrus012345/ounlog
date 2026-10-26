package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ounlog.saju.external.ai.AiSajuPreviewRequestMapper;
import ounlog.saju.external.ai.request.AiSajuPreviewRequest;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import tools.jackson.databind.JsonNode;

class AiSajuPreviewRequestMapperTest {

    private final AiSajuPreviewRequestMapper mapper = new AiSajuPreviewRequestMapper();

    @DisplayName("출생 사주, 오행 분포와 연운을 다시 계산하지 않고 보존한다.")
    @Test
    void preservesCalculatedValues() {
        ManseryeokCalculationResult calculation = SajuTestFixtures.calculationResult();

        AiSajuPreviewRequest request = mapper.map(calculation);

        assertThat(request.pillars()).isEqualTo(calculation.pillars());
        assertThat(request.elementCounts()).isEqualTo(calculation.context().elementCounts());
        assertThat(request.annualLuck()).isEqualTo(calculation.context().annualLuck());
    }

    @DisplayName("직렬화된 AI 입력에는 출생 사주, 오행 분포와 연운만 포함한다.")
    @Test
    void serializesOnlyPreviewFields() {
        AiSajuPreviewRequest request = mapper.map(SajuTestFixtures.calculationResult());

        JsonNode actual = SajuTestFixtures.JSON.valueToTree(request);
        JsonNode calculation = SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.calculationResult());
        var expected = SajuTestFixtures.JSON.createObjectNode();
        expected.set("pillars", calculation.get("pillars"));
        expected.set("elementCounts", calculation.get("context").get("elementCounts"));
        expected.set("annualLuck", calculation.get("context").get("annualLuck"));

        assertThat(actual).isEqualTo(expected);
    }
}
