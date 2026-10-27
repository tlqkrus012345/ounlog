package ounlog.saju.external.ai.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record AiSajuAnalysisResponse(
        @NotBlank String schemaVersion,
        @NotNull @Valid AnalysisParagraph fiveElements,
        @NotNull @Valid AnalysisParagraph annualOverview,
        @NotNull @Valid AnalysisParagraph personality,
        @NotNull @Valid AnalysisParagraph career,
        @NotNull @Valid AnalysisParagraph wealth,
        @NotNull @Valid AnalysisParagraph relationship,
        @NotNull @Valid AnalysisParagraph currentLuck) {}
