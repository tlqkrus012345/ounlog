package ounlog.saju.service;

import org.springframework.stereotype.Component;
import ounlog.saju.service.command.SajuAnalysisCommand;

@Component
public class DummySajuAnalysisGenerator implements SajuAnalysisGenerator {

    @Override
    public String generate(SajuAnalysisCommand command) {
        return "아주 운이 좋네요.";
    }
}
