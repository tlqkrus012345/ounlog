package ounlog.saju.service;

import ounlog.saju.external.manseryeok.ManseryeokCalculationResult;
import ounlog.saju.service.result.SajuPreviewResult;

public interface SajuPreviewGenerator {

    SajuPreviewResult generate(ManseryeokCalculationResult result);
}
