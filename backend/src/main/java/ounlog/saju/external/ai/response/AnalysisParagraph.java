package ounlog.saju.external.ai.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record AnalysisParagraph(
        @NotBlank String content, @NotNull List<@NotNull @Valid AnalysisEvidence> evidence) {}
