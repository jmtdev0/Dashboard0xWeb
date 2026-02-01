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

    // Crear tabla todos
    await sql`
      CREATE TABLE IF NOT EXISTS todos (
        id SERIAL PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Tabla todos creada');

    console.log('\n📊 Creando índices...');

    // Crear índices
    await sql`CREATE INDEX IF NOT EXISTS idx_dashboard_updated ON dashboard(updated_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_todos_updated ON todos(updated_at DESC)`;
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

    // Crear función para todos
    await sql`
      CREATE OR REPLACE FUNCTION keep_latest_todos()
      RETURNS TRIGGER AS $$
      BEGIN
        DELETE FROM todos WHERE id != NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Crear trigger para todos
    await sql`
      DROP TRIGGER IF EXISTS trigger_keep_latest_todos ON todos
    `;
    await sql`
      CREATE TRIGGER trigger_keep_latest_todos
        AFTER INSERT ON todos
        FOR EACH ROW
        EXECUTE FUNCTION keep_latest_todos()
    `;
    console.log('✅ Trigger todos configurado');

    console.log('\n✅ Base de datos inicializada correctamente');
    console.log('\nTablas creadas:');
    console.log('  - dashboard (con trigger para mantener último registro)');
    console.log('  - todos (con trigger para mantener último registro)');
    console.log('\nÍndices creados:');
    console.log('  - idx_dashboard_updated');
    console.log('  - idx_todos_updated');
  } catch (error) {
    console.error('❌ Error al inicializar la base de datos:', error);
    process.exit(1);
  }
}

initDatabase();
