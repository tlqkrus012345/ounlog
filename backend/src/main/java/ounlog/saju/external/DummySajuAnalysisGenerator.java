package ounlog.saju.external;

import java.util.List;
import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.service.SajuAnalysisGenerator;

public class DummySajuAnalysisGenerator implements SajuAnalysisGenerator {

    @Override
    public SajuInterpretation generate(ManseryeokCalculationResult result) {
        SajuInterpretation.Paragraph paragraph = new SajuInterpretation.Paragraph("테스트용 사주 해석입니다.", List.of());
        return new SajuInterpretation("2", paragraph, paragraph, paragraph, paragraph, paragraph, paragraph, paragraph);
    }
}
