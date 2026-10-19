package ounlog.saju.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;
import ounlog.common.exception.ErrorCode;

@Getter
@AllArgsConstructor
public enum SajuErrorCode implements ErrorCode {
    SAJU_ANALYSIS_NOT_FOUND(HttpStatus.NOT_FOUND, "SAJU_ANALYSIS_NOT_FOUND", "사주 분석 결과를 찾을 수 없습니다."),
    SAJU_CALCULATION_FAILED(HttpStatus.BAD_GATEWAY, "SAJU_CALCULATION_FAILED", "사주 정보를 계산하지 못했습니다."),
    SAJU_ANALYSIS_GENERATION_FAILED(HttpStatus.BAD_GATEWAY, "SAJU_ANALYSIS_GENERATION_FAILED", "사주 해석을 생성하지 못했습니다.");

    private final HttpStatus status;
    private final String code;
    private final String message;
}
