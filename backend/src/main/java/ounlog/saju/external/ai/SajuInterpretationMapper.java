package ounlog.saju.external.ai;

import org.springframework.stereotype.Component;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.external.ai.response.AiSajuAnalysisResponse;
import ounlog.saju.external.ai.response.AnalysisParagraph;

@Component
public class SajuInterpretationMapper {

    public SajuInterpretation map(AiSajuAnalysisResponse response) {
        return new SajuInterpretation(
                response.schemaVersion(),
                paragraph(response.fiveElements()),
                paragraph(response.annualOverview()),
                paragraph(response.personality()),
                paragraph(response.career()),
                paragraph(response.wealth()),
                paragraph(response.relationship()),
                paragraph(response.currentLuck()));
    }

    private SajuInterpretation.Paragraph paragraph(AnalysisParagraph paragraph) {
        return new SajuInterpretation.Paragraph(
                paragraph.content(),
                paragraph.evidence().stream()
                        .map(evidence -> new SajuInterpretation.Evidence(
                                evidence.source(), evidence.value(), evidence.interpretation()))
                        .toList());
    }
}
