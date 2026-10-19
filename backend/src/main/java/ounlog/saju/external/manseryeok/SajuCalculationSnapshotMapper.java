package ounlog.saju.external.manseryeok;

import org.springframework.stereotype.Component;
import ounlog.saju.entity.SajuCalculationSnapshot;
import ounlog.saju.external.manseryeok.response.AnnualLuckContext;
import ounlog.saju.external.manseryeok.response.CalculationContext;
import ounlog.saju.external.manseryeok.response.CalculationMetadata;
import ounlog.saju.external.manseryeok.response.CurrentLuckContext;
import ounlog.saju.external.manseryeok.response.ElementCounts;
import ounlog.saju.external.manseryeok.response.FourPillars;
import ounlog.saju.external.manseryeok.response.FourPositionValues;
import ounlog.saju.external.manseryeok.response.LuckPillarInfo;
import ounlog.saju.external.manseryeok.response.NextLuckContext;
import ounlog.saju.external.manseryeok.response.Pillar;
import ounlog.saju.external.manseryeok.response.StemBranchValue;

@Component
public class SajuCalculationSnapshotMapper {

    public SajuCalculationSnapshot map(ManseryeokCalculationResult result) {
        FourPillars pillars = result.pillars();
        LuckPillarInfo luck = result.luckPillars();
        CalculationContext context = result.context();
        ElementCounts counts = context.elementCounts();
        AnnualLuckContext annual = context.annualLuck();
        CurrentLuckContext current = context.currentLuck();
        NextLuckContext next = context.nextLuck();
        CalculationMetadata metadata = result.metadata();

        return new SajuCalculationSnapshot(
                "1",
                new SajuCalculationSnapshot.FourPillars(
                        pillar(pillars.year()), pillar(pillars.month()), pillar(pillars.day()), pillar(pillars.hour())),
                values(result.elements()),
                values(result.yinYang()),
                values(result.tenGods()),
                result.voidBranches(),
                new SajuCalculationSnapshot.LuckPillarInfo(
                        luck.forward(),
                        luck.startAge(),
                        luck.startYears(),
                        luck.startMonths(),
                        luck.startDays(),
                        luck.pillars().stream()
                                .map(value -> new SajuCalculationSnapshot.LuckPillar(
                                        value.age(), pillar(value.pillar()), value.korean()))
                                .toList()),
                new SajuCalculationSnapshot.Context(
                        context.asOf(),
                        context.asOfDate(),
                        context.solarBirthDate(),
                        context.gender(),
                        context.currentAge(),
                        new SajuCalculationSnapshot.ElementCounts(
                                counts.wood(), counts.fire(), counts.earth(), counts.metal(), counts.water()),
                        new SajuCalculationSnapshot.AnnualLuck(
                                annual.year(),
                                annual.startAt(),
                                annual.endAtExclusive(),
                                annual.startDate(),
                                annual.endDate(),
                                pillar(annual.pillar()),
                                value(annual.tenGods())),
                        current == null
                                ? null
                                : new SajuCalculationSnapshot.LuckPeriod(
                                        current.startDate(),
                                        current.endDate(),
                                        current.ageFrom(),
                                        current.ageTo(),
                                        pillar(current.pillar()),
                                        current.korean()),
                        next == null
                                ? null
                                : new SajuCalculationSnapshot.LuckPeriod(
                                        next.startDate(),
                                        next.endDate(),
                                        next.ageFrom(),
                                        next.ageTo(),
                                        pillar(next.pillar()),
                                        next.korean())),
                new SajuCalculationSnapshot.Metadata(
                        metadata.engine(),
                        metadata.version(),
                        metadata.timeZone(),
                        metadata.dayBoundary(),
                        metadata.ageBasis(),
                        metadata.elementCountMethod()));
    }

    private SajuCalculationSnapshot.Pillar pillar(Pillar pillar) {
        return new SajuCalculationSnapshot.Pillar(pillar.heavenlyStem(), pillar.earthlyBranch());
    }

    private SajuCalculationSnapshot.StemBranchValue value(StemBranchValue value) {
        return new SajuCalculationSnapshot.StemBranchValue(value.stem(), value.branch());
    }

    private SajuCalculationSnapshot.FourPositionValues values(FourPositionValues values) {
        return new SajuCalculationSnapshot.FourPositionValues(
                value(values.year()), value(values.month()), value(values.day()), value(values.hour()));
    }
}
