package ounlog.saju.service;

import org.springframework.stereotype.Component;
import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.result.SajuAnalysisResult;

@Component
public class DummySajuAnalysisGenerator implements SajuAnalysisGenerator {

    @Override
    public SajuAnalysisResult generate(SajuAnalysisCommand command) {
        return new SajuAnalysisResult("아주 운이 좋네요.");
    }
}
