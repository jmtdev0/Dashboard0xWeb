-- Tabla para datos del dashboard (scraping results)
CREATE TABLE IF NOT EXISTS dashboard (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla para TODOs
CREATE TABLE IF NOT EXISTS todos (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_dashboard_updated ON dashboard(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_updated ON todos(updated_at DESC);

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

-- Igual para TODOs: mantener solo el registro más reciente
CREATE OR REPLACE FUNCTION keep_latest_todos()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM todos WHERE id != NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_keep_latest_todos
  AFTER INSERT ON todos
  FOR EACH ROW
  EXECUTE FUNCTION keep_latest_todos();
