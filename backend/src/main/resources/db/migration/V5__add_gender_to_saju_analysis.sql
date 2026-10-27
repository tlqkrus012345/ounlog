ALTER TABLE saju_analysis
    ADD COLUMN gender VARCHAR(10) NOT NULL,
    ADD CONSTRAINT ck_saju_analysis_gender
        CHECK (gender IN ('MALE', 'FEMALE'));
