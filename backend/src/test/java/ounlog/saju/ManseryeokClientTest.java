package ounlog.saju;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.jsonPath;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import jakarta.validation.Validation;
import jakarta.validation.ValidatorFactory;
import java.net.SocketTimeoutException;
import java.time.Instant;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;
import ounlog.saju.exception.SajuErrorCode;
import ounlog.saju.exception.SajuException;
import ounlog.saju.external.manseryeok.ManseryeokClient;
import ounlog.saju.external.manseryeok.request.ManseryeokCalculationRequest;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import tools.jackson.databind.node.ObjectNode;

class ManseryeokClientTest {
    ValidatorFactory factory;
    MockRestServiceServer server;
    ManseryeokClient client;

    @BeforeEach
    void setUp() {
        factory = Validation.buildDefaultValidatorFactory();
        RestClient.Builder builder = RestClient.builder().baseUrl("http://manseryeok.test");
        server = MockRestServiceServer.bindTo(builder).build();
        client = new ManseryeokClient(builder.build(), factory.getValidator());
    }

    @AfterEach
    void tearDown() {
        factory.close();
        server.verify();
    }

    @DisplayName("Node 요청 계약을 전송하고 계산 결과를 읽는다.")
    @Test
    void sendsNodeContractAndReadsResponse() {
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andExpect(method(HttpMethod.POST))
                .andExpect(jsonPath("$.isLunar").value(false))
                .andExpect(jsonPath("$.isLeapMonth").value(false))
                .andExpect(jsonPath("$.gender").value("male"))
                .andExpect(jsonPath("$.asOf").exists())
                .andRespond(withSuccess(SajuTestFixtures.calculationJson(), MediaType.APPLICATION_JSON));

        ManseryeokCalculationResponse response = client.calculate(request());

        assertThat(response.context().currentAge()).isEqualTo(33);
        assertThat(response.context().annualLuck().year()).isEqualTo(2026);
    }

    @DisplayName("Node 응답 본문이 비어 있으면 계산 실패로 처리한다.")
    @Test
    void rejectsEmptyBody() {
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess("", MediaType.APPLICATION_JSON));
        assertCalculationFailure();
    }

    @DisplayName("필수 중첩 계산 정보가 없으면 계산 실패로 처리한다.")
    @Test
    void rejectsMissingNestedCalculation() {
        ObjectNode root = (ObjectNode) SajuTestFixtures.JSON.readTree(SajuTestFixtures.calculationJson());
        ((ObjectNode) root.get("context")).remove("annualLuck");
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess(root.toString(), MediaType.APPLICATION_JSON));
        assertCalculationFailure();
    }

    @DisplayName("저장할 전체 대운 목록이 누락되면 계산 실패로 처리한다.")
    @Test
    void rejectsMissingLuckPillars() {
        ObjectNode root = (ObjectNode) SajuTestFixtures.JSON.readTree(SajuTestFixtures.calculationJson());
        ((ObjectNode) root.get("luckPillars")).remove("pillars");
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess(root.toString(), MediaType.APPLICATION_JSON));
        assertCalculationFailure();
    }

    @DisplayName("대운 목록의 간지가 누락되면 계산 실패로 처리한다.")
    @Test
    void rejectsMissingLuckPillar() {
        ObjectNode root = (ObjectNode) SajuTestFixtures.JSON.readTree(SajuTestFixtures.calculationJson());
        ((ObjectNode) root.get("luckPillars").get("pillars").get(0)).remove("pillar");
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess(root.toString(), MediaType.APPLICATION_JSON));
        assertCalculationFailure();
    }

    @DisplayName("Node의 잘못된 JSON을 계산 실패로 처리한다.")
    @Test
    void rejectsMalformedJson() {
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess("{invalid", MediaType.APPLICATION_JSON));
        assertCalculationFailure();
    }

    @DisplayName("현재와 다음 대운이 없는 정상 응답을 허용한다.")
    @Test
    void acceptsAbsentCurrentAndNextLuck() {
        ObjectNode root = (ObjectNode) SajuTestFixtures.JSON.readTree(SajuTestFixtures.calculationJson());
        ObjectNode context = (ObjectNode) root.get("context");
        context.putNull("currentLuck");
        context.putNull("nextLuck");
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess(root.toString(), MediaType.APPLICATION_JSON));
        assertThat(client.calculate(request()).context().currentLuck()).isNull();
    }

    @DisplayName("요청과 응답의 기준 시각이 다르면 거부한다.")
    @Test
    void rejectsMismatchedReferenceTime() {
        server.expect(requestTo("http://manseryeok.test/calculations"))
                .andRespond(withSuccess(SajuTestFixtures.calculationJson(), MediaType.APPLICATION_JSON));
        ManseryeokCalculationRequest request = new ManseryeokCalculationRequest(
                1992, 10, 24, 5, 30, false, false, "male", "midnight", Instant.parse("2026-10-18T00:00:00Z"));
        assertThatThrownBy(() -> client.calculate(request))
                .isInstanceOf(SajuException.class)
                .hasFieldOrPropertyWithValue("errorCode", SajuErrorCode.SAJU_CALCULATION_FAILED);
    }

    @DisplayName("Node 서버 오류를 계산 실패로 변환한다.")
    @Test
    void convertsNodeServerError() {
        server.expect(requestTo("http://manseryeok.test/calculations")).andRespond(withServerError());
        assertCalculationFailure();
    }

    @DisplayName("네트워크 타임아웃을 계산 실패로 변환한다.")
    @Test
    void convertsNetworkTimeout() {
        server.expect(requestTo("http://manseryeok.test/calculations")).andRespond(request -> {
            throw new SocketTimeoutException("simulated timeout");
        });
        assertCalculationFailure();
    }

    private void assertCalculationFailure() {
        assertThatThrownBy(() -> client.calculate(request()))
                .isInstanceOf(SajuException.class)
                .hasFieldOrPropertyWithValue("errorCode", SajuErrorCode.SAJU_CALCULATION_FAILED);
    }

    private ManseryeokCalculationRequest request() {
        return new ManseryeokCalculationRequest(
                1992, 10, 24, 5, 30, false, false, "male", "midnight", Instant.parse("2026-10-17T00:00:00.000123Z"));
    }
}
