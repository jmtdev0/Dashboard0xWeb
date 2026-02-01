import { neon } from '@netlify/neon';
import { readFileSync } from 'fs';
import { join } from 'path';

async function initDatabase() {
  try {
    const sql = neon();

    console.log('🔧 Inicializando base de datos Netlify DB...\n');

    console.log('📄 Creando tablas...');

    // Crear tabla dashboard
    await sql`
      CREATE TABLE IF NOT EXISTS dashboard (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Tabla dashboard creada');

    // Crear tabla todos (normalizada - un registro por TODO)
    await sql`
      CREATE TABLE IF NOT EXISTS todos (
        id VARCHAR(50) PRIMARY KEY,
        text TEXT NOT NULL CHECK (LENGTH(text) >= 1 AND LENGTH(text) <= 500),
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Tabla todos creada');

    console.log('\n📊 Creando índices...');

    // Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_dashboard_updated ON dashboard(updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_todos_created ON todos(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_todos_completed_at ON todos(completed_at DESC) WHERE completed_at IS NOT NULL`;
    console.log('✅ Índices creados');

    console.log('\n⚙️ Creando funciones y triggers...');

    // Crear función para dashboard
    await sql`
      CREATE OR REPLACE FUNCTION keep_latest_dashboard()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM dashboard WHERE id != NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Crear trigger para dashboard
    await sql`
      DROP TRIGGER IF EXISTS trigger_keep_latest_dashboard ON dashboard
    `;
    await sql`
      CREATE TRIGGER trigger_keep_latest_dashboard
        AFTER INSERT ON dashboard
        FOR EACH ROW
        EXECUTE FUNCTION keep_latest_dashboard()
    `;
    console.log('✅ Trigger dashboard configurado');

    // Crear función para actualizar timestamp en todos
    await sql`
      CREATE OR REPLACE FUNCTION update_todos_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Crear trigger para actualizar updated_at en todos
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_todos_timestamp ON todos
    `;
    await sql`
      CREATE TRIGGER trigger_update_todos_timestamp
        BEFORE UPDATE ON todos
        FOR EACH ROW
        EXECUTE FUNCTION update_todos_timestamp()
    `;
    console.log('✅ Trigger todos configurado');

    console.log('\n✅ Base de datos inicializada correctamente');
    console.log('\nTablas creadas:');
    console.log('  - dashboard (JSONB - mantiene último registro via trigger)');
    console.log('  - todos (relacional - un registro por TODO)');
    console.log('\nÍndices creados:');
    console.log('  - idx_dashboard_updated');
    console.log('  - idx_todos_created');
    console.log('  - idx_todos_completed');
    console.log('  - idx_todos_completed_at');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

initDatabase();
