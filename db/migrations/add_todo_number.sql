-- Migration: Add stable display numbers to todos
-- Date: 2026-06-17

ALTER TABLE todos
ADD COLUMN IF NOT EXISTS todo_number INTEGER;

WITH numbered AS (
  SELECT
    id,
    (
      COALESCE((SELECT MAX(todo_number) FROM todos WHERE todo_number IS NOT NULL), 0)
      + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)
    )::INTEGER AS next_number
  FROM todos
  WHERE todo_number IS NULL
)
UPDATE todos
SET todo_number = numbered.next_number
FROM numbered
WHERE todos.id = numbered.id;

ALTER TABLE todos
ALTER COLUMN todo_number SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_number_unique ON todos(todo_number);
CREATE INDEX IF NOT EXISTS idx_todos_number ON todos(todo_number ASC);
