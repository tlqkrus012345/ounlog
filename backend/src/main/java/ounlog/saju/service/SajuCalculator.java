package ounlog.saju.service;

import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.service.command.SajuAnalysisCommand;

public interface SajuCalculator {

    ManseryeokCalculationResult calculate(SajuAnalysisCommand command);
}
