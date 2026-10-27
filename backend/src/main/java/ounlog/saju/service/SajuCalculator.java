package ounlog.saju.service;

import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;

public interface SajuCalculator {

    ManseryeokCalculationResult calculate(SajuBirthInfo birthInfo);
}
