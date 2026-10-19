package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import ounlog.saju.entity.SajuCalculationSnapshot;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.SajuCalculationSnapshotMapper;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import tools.jackson.databind.node.ObjectNode;

class SajuCalculationSnapshotMapperTest {

    private final SajuCalculationSnapshotMapper mapper = new SajuCalculationSnapshotMapper();

    @DisplayName("계산값과 계산 정책을 누락 없이 외부 DTO와 독립적인 스냅샷으로 변환한다.")
    @Test
    void preservesAllCalculatedFields() {
        SajuCalculationSnapshot snapshot = mapper.map(SajuTestFixtures.calculationResult());
        ObjectNode actual = SajuTestFixtures.JSON.valueToTree(snapshot);
        assertThat(actual.remove("schemaVersion").asString()).isEqualTo("1");
        tools.jackson.databind.JsonNode expected =
                SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.calculationResult());

        assertThat(actual).isEqualTo(expected);
    }

    @DisplayName("현재 또는 다음 대운이 없는 계산 결과도 그대로 저장한다.")
    @Test
    void preservesAbsentLuckPeriods() {
        ObjectNode response = SajuTestFixtures.JSON.valueToTree(SajuTestFixtures.calculationResponse());
        ((ObjectNode) response.get("context")).putNull("currentLuck").putNull("nextLuck");
        ManseryeokCalculationResult calculation = ManseryeokCalculationResult.from(
                SajuTestFixtures.JSON.treeToValue(response, ManseryeokCalculationResponse.class));

        SajuCalculationSnapshot snapshot = mapper.map(calculation);

        assertThat(snapshot.context().currentLuck()).isNull();
        assertThat(snapshot.context().nextLuck()).isNull();
        assertThat(snapshot.context().asOf()).isEqualTo(calculation.context().asOf());
    }
}
