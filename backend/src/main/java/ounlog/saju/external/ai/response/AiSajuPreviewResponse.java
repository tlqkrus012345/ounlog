package ounlog.saju.external.ai.response;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record AiSajuPreviewResponse(
        @NotBlank @Size(max = 20) String keyword, @NotBlank @Size(max = 300) String summary) {}
