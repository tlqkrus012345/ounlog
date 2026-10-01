CREATE TABLE saju_analysis
(
    saju_analysis_id   BIGINT      NOT NULL AUTO_INCREMENT,
    member_id     BIGINT      NOT NULL,
    birth_date    DATE        NOT NULL,
    birth_time    TIME,
    calendar_type VARCHAR(20) NOT NULL,
    result        LONGTEXT    NOT NULL,
    created_at    DATETIME(6) NOT NULL,

    CONSTRAINT pk_saju_analysis PRIMARY KEY (saju_analysis_id),
    CONSTRAINT ck_analysis_calendar_type
        CHECK (calendar_type IN ('SOLAR', 'LUNAR'))
);
