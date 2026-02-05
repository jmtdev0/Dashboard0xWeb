-- Migration: Add pinned field to todos table
-- Date: 2026-02-05

-- Add pinned column with default value FALSE
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;

-- Create index for better performance when sorting by pinned status
CREATE INDEX IF NOT EXISTS idx_todos_pinned ON todos(pinned DESC, created_at DESC);

-- Verify the migration
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'todos' AND column_name = 'pinned';
