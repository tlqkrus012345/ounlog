package ounlog.saju.repository;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import ounlog.saju.entity.SajuAnalysis;

public interface SajuAnalysisRepository extends JpaRepository<SajuAnalysis, Long> {

    Optional<SajuAnalysis> findByMemberId(Long memberId);
}
