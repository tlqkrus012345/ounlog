-- Legacy analysis rows cannot be backfilled reliably because gender was not collected.
-- New writes require gender and birth_time at the API boundary; DB NOT NULL follows after a legacy-data policy is decided.
ALTER TABLE saju_analysis
    ADD COLUMN gender VARCHAR(10) NOT NULL,
    ADD CONSTRAINT ck_saju_analysis_gender
        CHECK (gender IN ('MALE', 'FEMALE'));
