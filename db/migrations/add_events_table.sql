-- Migration: Add events table for calendar feature
-- Date: 2026-02-28

CREATE TABLE IF NOT EXISTS events (
  id VARCHAR(50) PRIMARY KEY,
  title TEXT NOT NULL CHECK (LENGTH(title) >= 1 AND LENGTH(title) <= 200),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT CHECK (description IS NULL OR LENGTH(description) <= 1000),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date ASC);
CREATE INDEX IF NOT EXISTS idx_events_created ON events(created_at DESC);

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION update_events_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_events_timestamp
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_events_timestamp();
