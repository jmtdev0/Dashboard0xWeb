-- Tabla para datos del dashboard (scraping results)
CREATE TABLE IF NOT EXISTS dashboard (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para TODOs (normalizada - un registro por TODO)
CREATE TABLE IF NOT EXISTS todos (
  id VARCHAR(50) PRIMARY KEY,
  text TEXT NOT NULL CHECK (LENGTH(text) >= 1 AND LENGTH(text) <= 500),
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_dashboard_updated ON dashboard(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_created ON todos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at DESC) WHERE completed_at IS NOT NULL;

-- Solo queremos 1 registro en dashboard (latest data)
-- Crear una función trigger para mantener solo el más reciente
CREATE OR REPLACE FUNCTION keep_latest_dashboard()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM dashboard WHERE id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_keep_latest_dashboard
  AFTER INSERT ON dashboard
  FOR EACH ROW
  EXECUTE FUNCTION keep_latest_dashboard();

-- Trigger para actualizar updated_at en todos
CREATE OR REPLACE FUNCTION update_todos_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_todos_timestamp
  BEFORE UPDATE ON todos
  FOR EACH ROW
  EXECUTE FUNCTION update_todos_timestamp();
