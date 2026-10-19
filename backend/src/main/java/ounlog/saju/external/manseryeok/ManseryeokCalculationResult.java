package ounlog.saju.external.manseryeok;

import java.util.List;
import lombok.Builder;
import ounlog.saju.external.manseryeok.response.*;

@Builder
public record ManseryeokCalculationResult(
        FourPillars pillars,
        FourPositionValues elements,
        FourPositionValues yinYang,
        FourPositionValues tenGods,
        List<String> voidBranches,
        LuckPillarInfo luckPillars,
        CalculationContext context,
        CalculationMetadata metadata) {

    public static ManseryeokCalculationResult from(ManseryeokCalculationResponse response) {
        return ManseryeokCalculationResult.builder()
                .pillars(response.pillars())
                .elements(response.elements())
                .yinYang(response.yinYang())
                .tenGods(response.tenGods())
                .voidBranches(response.voidBranches())
                .luckPillars(response.luckPillars())
                .context(response.context())
                .metadata(response.metadata())
                .build();
    }
}
