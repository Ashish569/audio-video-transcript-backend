-- Table
CREATE TABLE IF NOT EXISTS media_files (
    id             VARCHAR         PRIMARY KEY,
    original_name  VARCHAR(512)  NOT NULL,
    stored_name    VARCHAR(255)  NOT NULL,
    file_path      TEXT          NOT NULL,
    mime_type      VARCHAR(100),
    file_size      BIGINT        NOT NULL,
    public_url_path TEXT,
    duration_sec   FLOAT,
    status         VARCHAR(50)   NOT NULL DEFAULT 'pending',
    error_message  TEXT,
    created_on     TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    modified_on    TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_media_files_status      ON media_files(status);
CREATE INDEX IF NOT EXISTS idx_media_files_created_on  ON media_files(created_on DESC);

-- Trigger for auto-updating modified_on
CREATE OR REPLACE FUNCTION update_modified_on()
RETURNS TRIGGER AS $$
BEGIN
    NEW.modified_on = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trigger_update_modified_on
    BEFORE UPDATE ON media_files
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_on();



-- 1. Metadata table (one row per media file)
CREATE TABLE IF NOT EXISTS transcriptions (
    media_file_id   VARCHAR          NOT NULL PRIMARY KEY,
    language        VARCHAR(10)   DEFAULT NULL,          -- e.g. 'en', 'hi', 'te'
    model_used      VARCHAR(50)   DEFAULT NULL,          -- e.g. 'faster-whisper-medium', 'base.en'
    created_on      TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP,
    modified_on     TIMESTAMPTZ   DEFAULT CURRENT_TIMESTAMP
);

-- 2. Segments table (one row per transcribed segment)
CREATE TABLE IF NOT EXISTS transcription_segments (
    media_file_id       VARCHAR NOT NULL ,
    start_time          FLOAT NOT NULL,
    end_time            FLOAT NOT NULL,
    content             TEXT NOT NULL,
    confidence          FLOAT DEFAULT NULL,
    created_on          TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT valid_times CHECK (start_time >= 0 AND end_time > start_time)
);

-- Indexes for fast lookup
CREATE INDEX idx_transcriptions_media_file_id ON transcriptions(media_file_id);
CREATE INDEX idx_segments_media_file_id ON transcription_segments(media_file_id);
CREATE INDEX idx_segments_start_time ON transcription_segments(start_time);    
