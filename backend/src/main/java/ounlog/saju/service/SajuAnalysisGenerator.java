package ounlog.saju.service;

import ounlog.saju.service.command.SajuAnalysisCommand;
import ounlog.saju.service.result.SajuAnalysisResult;

public interface SajuAnalysisGenerator {

    SajuAnalysisResult generate(SajuAnalysisCommand command);
}
