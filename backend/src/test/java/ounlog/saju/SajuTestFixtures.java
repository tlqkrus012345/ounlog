package ounlog.saju;

import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import ounlog.saju.entity.SajuCalculationSnapshot;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.external.ai.response.AiSajuAnalysisResponse;
import ounlog.saju.external.ai.response.AnalysisEvidence;
import ounlog.saju.external.ai.response.AnalysisParagraph;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.external.manseryeok.SajuCalculationSnapshotMapper;
import ounlog.saju.external.manseryeok.response.ManseryeokCalculationResponse;
import tools.jackson.databind.json.JsonMapper;

final class SajuTestFixtures {
    static final JsonMapper JSON = JsonMapper.builder().build();

    private SajuTestFixtures() {}

    static String calculationJson() {
        try {
            return new ClassPathResource("saju/manseryeok-response.json").getContentAsString(StandardCharsets.UTF_8);
        } catch (IOException exception) {
            throw new UncheckedIOException(exception);
        }
    }

    static ManseryeokCalculationResponse calculationResponse() {
        return JSON.readValue(calculationJson(), ManseryeokCalculationResponse.class);
    }

    static ManseryeokCalculationResult calculationResult() {
        return ManseryeokCalculationResult.from(calculationResponse());
    }

    static SajuCalculationSnapshot calculationSnapshot() {
        return new SajuCalculationSnapshotMapper().map(calculationResult());
    }

    static SajuInterpretation interpretation(String content) {
        SajuInterpretation.Paragraph paragraph = new SajuInterpretation.Paragraph(
                content, List.of(new SajuInterpretation.Evidence("pillars.day.heavenlyStem", "계", "일간을 반영했습니다.")));
        return new SajuInterpretation("2", paragraph, paragraph, paragraph, paragraph, paragraph, paragraph, paragraph);
    }

    static AiSajuAnalysisResponse analysisResponse() {
        AnalysisParagraph paragraph = new AnalysisParagraph(
                "계산된 명식을 바탕으로 작성한 해석입니다.",
                List.of(
                        new AnalysisEvidence("pillars.day.heavenlyStem", "계", "일간을 해석에 반영했습니다."),
                        new AnalysisEvidence("elementCounts.wood", "2", "표면 오행 분포를 반영했습니다."),
                        new AnalysisEvidence("voidBranches[0]", "술", "제공된 공망 정보입니다.")));
        return new AiSajuAnalysisResponse(
                "2", paragraph, paragraph, paragraph, paragraph, paragraph, paragraph, paragraph);
    }
}
