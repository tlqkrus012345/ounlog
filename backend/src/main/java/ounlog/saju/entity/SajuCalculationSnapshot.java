package ounlog.saju.entity;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/** 생성 당시의 계산값과 기준 시점을 보존한다. 외부 HTTP DTO에 의존하지 않는다. */
public record SajuCalculationSnapshot(
        String schemaVersion,
        FourPillars pillars,
        FourPositionValues elements,
        FourPositionValues yinYang,
        FourPositionValues tenGods,
        List<String> voidBranches,
        LuckPillarInfo luckPillars,
        Context context,
        Metadata metadata) {

    public SajuCalculationSnapshot {
        voidBranches = List.copyOf(voidBranches);
    }

    public record Pillar(String heavenlyStem, String earthlyBranch) {}

    public record FourPillars(Pillar year, Pillar month, Pillar day, Pillar hour) {}

    public record StemBranchValue(String stem, String branch) {}

    public record FourPositionValues(
            StemBranchValue year, StemBranchValue month, StemBranchValue day, StemBranchValue hour) {}

    public record LuckPillar(int age, Pillar pillar, String korean) {}

    public record LuckPillarInfo(
            boolean forward, int startAge, int startYears, int startMonths, int startDays, List<LuckPillar> pillars) {
        public LuckPillarInfo {
            pillars = List.copyOf(pillars);
        }
    }

    public record Context(
            Instant asOf,
            LocalDate asOfDate,
            LocalDate solarBirthDate,
            Gender gender,
            int currentAge,
            ElementCounts elementCounts,
            AnnualLuck annualLuck,
            LuckPeriod currentLuck,
            LuckPeriod nextLuck) {}

    public record ElementCounts(int wood, int fire, int earth, int metal, int water) {}

    public record AnnualLuck(
            int year,
            Instant startAt,
            Instant endAtExclusive,
            LocalDate startDate,
            LocalDate endDate,
            Pillar pillar,
            StemBranchValue tenGods) {}

    public record LuckPeriod(
            LocalDate startDate, LocalDate endDate, int ageFrom, int ageTo, Pillar pillar, String korean) {}

    public record Metadata(
            String engine,
            String version,
            String timeZone,
            String dayBoundary,
            String ageBasis,
            String elementCountMethod) {}
}
