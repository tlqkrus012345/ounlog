package ounlog.saju.service;

import ounlog.saju.entity.SajuInterpretation;
import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;

public interface SajuAnalysisGenerator {

    SajuInterpretation generate(ManseryeokCalculationResult result);
}
