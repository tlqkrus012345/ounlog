package ounlog.saju.service;

import ounlog.saju.service.command.SajuAnalysisCommand;

public interface SajuAnalysisGenerator {

    String generate(SajuAnalysisCommand command);
}
