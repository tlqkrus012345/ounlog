ALTER TABLE saju_analysis
    MODIFY COLUMN result LONGTEXT NULL,
    ADD COLUMN calculation_snapshot JSON NULL,
    ADD COLUMN interpretation JSON NULL;
