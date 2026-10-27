package ounlog.saju.external.ai.response;

import jakarta.validation.constraints.NotBlank;

public record AnalysisEvidence(
        @NotBlank String source,
        @NotBlank String value,
        @NotBlank String interpretation) {}
