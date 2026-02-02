import { neon } from '@netlify/neon';

async function addCategories() {
  try {
    const sql = neon();

    console.log('🔧 Añadiendo sistema de categorías a la base de datos...\n');

    console.log('📄 Creando tabla categories...');

    // Crear tabla categories con estructura de árbol recursivo
    await sql`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (LENGTH(name) >= 1 AND LENGTH(name) <= 100),
        parent_id TEXT REFERENCES categories(id) ON DELETE CASCADE,
        user_id TEXT NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Tabla categories creada');

    console.log('📄 Añadiendo columna category_id a tabla todos...');

    // Añadir columna category_id a la tabla todos
    await sql`
      ALTER TABLE todos
      ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES categories(id) ON DELETE SET NULL
    `;
    console.log('✅ Columna category_id añadida a todos');

    console.log('\n📊 Creando índices...');

    // Crear índices para optimizar consultas
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_categories_user ON categories(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_todos_category ON todos(category_id)`;
    console.log('✅ Índices creados');

    console.log('\n⚙️ Creando trigger para actualizar timestamp...');

    // Crear función para actualizar timestamp en categories
    await sql`
      CREATE OR REPLACE FUNCTION update_categories_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    // Crear trigger para actualizar updated_at en categories
    await sql`
      DROP TRIGGER IF EXISTS trigger_update_categories_timestamp ON categories
    `;
    await sql`
      CREATE TRIGGER trigger_update_categories_timestamp
        BEFORE UPDATE ON categories
        FOR EACH ROW
        EXECUTE FUNCTION update_categories_timestamp()
    `;
    console.log('✅ Trigger categories configurado');

    console.log('\n✅ Sistema de categorías añadido correctamente');
    console.log('\nCambios realizados:');
    console.log('  - Tabla categories creada (estructura de árbol recursivo)');
    console.log('  - Columna category_id añadida a tabla todos');
    console.log('  - Índices optimizados creados');
    console.log('  - Trigger de timestamp configurado');
    console.log('\nCaracterísticas:');
    console.log('  - Soporte para N niveles de subcategorías');
    console.log('  - Al borrar categoría, se borran subcategorías (CASCADE)');
    console.log('  - Al borrar categoría, TODOs mantienen referencia NULL');
  } catch (error) {
    console.error('❌ Error al añadir categorías:', error);
    process.exit(1);
  }
}

addCategories();
