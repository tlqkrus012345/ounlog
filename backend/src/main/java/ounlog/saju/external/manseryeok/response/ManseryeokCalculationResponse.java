package ounlog.saju.external.manseryeok.response;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;

public record ManseryeokCalculationResponse(
        @NotNull @Valid FourPillars pillars,
        @NotNull @Valid FourPositionValues elements,
        @NotNull @Valid FourPositionValues yinYang,
        @NotNull @Valid FourPositionValues tenGods,
        @NotNull List<@NotNull String> voidBranches,
        @NotNull @Valid LuckPillarInfo luckPillars,
        @NotNull @Valid CalculationContext context,
        @NotNull @Valid CalculationMetadata metadata) {}
