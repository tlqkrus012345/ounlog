ALTER TABLE member
    ADD COLUMN failed_login_count TINYINT UNSIGNED NOT NULL DEFAULT 0,
    ADD COLUMN login_locked_until DATETIME(6) NULL DEFAULT NULL,
    ADD CONSTRAINT chk_member_login_lock CHECK (
        (failed_login_count BETWEEN 0 AND 4 AND login_locked_until IS NULL)
        OR (failed_login_count = 5 AND login_locked_until IS NOT NULL)
    );

CREATE TABLE auth_session (
    session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL PRIMARY KEY,
    member_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    last_activity_at DATETIME(6) NOT NULL,
    absolute_expires_at DATETIME(6) NOT NULL,
    current_refresh_token_hash BINARY(32) NOT NULL,
    revoked_at DATETIME(6) NULL,
    CONSTRAINT fk_auth_session_member FOREIGN KEY (member_id) REFERENCES member (member_id),
    CONSTRAINT chk_auth_session_times CHECK (
        created_at <= last_activity_at AND last_activity_at <= absolute_expires_at
        AND created_at < absolute_expires_at AND (revoked_at IS NULL OR revoked_at >= created_at)
    ),
    INDEX idx_auth_session_absolute_expires_at (absolute_expires_at)
);

CREATE TABLE auth_refresh_token (
    token_hash BINARY(32) NOT NULL PRIMARY KEY,
    session_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
    issued_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_auth_refresh_session FOREIGN KEY (session_id)
        REFERENCES auth_session (session_id) ON DELETE CASCADE
);
