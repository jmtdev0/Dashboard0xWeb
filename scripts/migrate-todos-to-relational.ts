import { neon } from '@netlify/neon';

async function migrateTodosToRelational() {
  try {
    const sql = neon();

    console.log('🔄 Migrando estructura de TODOs de JSONB a relacional...\n');

    // 1. Obtener datos existentes en formato JSONB (si existen)
    console.log('📊 Verificando datos existentes...');
    let existingTodos: any[] = [];

    try {
      const [oldRow] = await sql`
        SELECT data FROM todos_old ORDER BY created_at DESC LIMIT 1
      `;

      if (oldRow && oldRow.data && oldRow.data.todos) {
        existingTodos = oldRow.data.todos;
        console.log(`✅ Encontrados ${existingTodos.length} TODOs en formato antiguo`);
      } else {
        console.log('⚠️  No hay datos en formato antiguo');
      }
    } catch (error: any) {
      // Si la tabla todos_old no existe, intentar leer de la tabla actual
      if (error.message?.includes('does not exist')) {
        console.log('⚠️  Tabla todos_old no existe, verificando tabla actual...');

        try {
          const [currentRow] = await sql`
            SELECT data FROM todos ORDER BY updated_at DESC LIMIT 1
          `;

          if (currentRow && currentRow.data && currentRow.data.todos) {
            existingTodos = currentRow.data.todos;
            console.log(`✅ Encontrados ${existingTodos.length} TODOs en formato antiguo (tabla actual)`);

            // Renombrar la tabla actual a todos_old antes de recrear
            console.log('📦 Respaldando tabla actual como todos_old...');
            await sql`ALTER TABLE todos RENAME TO todos_old`;
            console.log('✅ Tabla respaldada');
          }
        } catch (innerError) {
          console.log('⚠️  No se pudieron leer datos existentes');
        }
      }
    }

    // 2. Recrear la tabla todos con estructura relacional
    console.log('\n🏗️  Recreando tabla todos con estructura relacional...');

    // Drop tabla actual si existe (ya respaldada como todos_old)
    await sql`DROP TABLE IF EXISTS todos CASCADE`;

    // Crear nueva estructura
    await sql`
      CREATE TABLE todos (
        id VARCHAR(50) PRIMARY KEY,
        text TEXT NOT NULL CHECK (LENGTH(text) >= 1 AND LENGTH(text) <= 500),
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL,
        completed_at TIMESTAMP WITH TIME ZONE,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;
    console.log('✅ Tabla todos creada con estructura relacional');

    // Crear índices
    await sql`CREATE INDEX idx_todos_created ON todos(created_at DESC)`;
    await sql`CREATE INDEX idx_todos_completed ON todos(completed)`;
    await sql`CREATE INDEX idx_todos_completed_at ON todos(completed_at DESC) WHERE completed_at IS NOT NULL`;
    console.log('✅ Índices creados');

    // Crear trigger para updated_at
    await sql`
      CREATE OR REPLACE FUNCTION update_todos_timestamp()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `;

    await sql`
      DROP TRIGGER IF EXISTS trigger_update_todos_timestamp ON todos
    `;

    await sql`
      CREATE TRIGGER trigger_update_todos_timestamp
        BEFORE UPDATE ON todos
        FOR EACH ROW
        EXECUTE FUNCTION update_todos_timestamp()
    `;
    console.log('✅ Trigger creado');

    // 3. Migrar datos existentes
    if (existingTodos.length > 0) {
      console.log(`\n📝 Migrando ${existingTodos.length} TODOs...`);

      for (const todo of existingTodos) {
        await sql`
          INSERT INTO todos (id, text, completed, created_at, completed_at)
          VALUES (
            ${todo.id},
            ${todo.text},
            ${todo.completed},
            ${todo.createdAt},
            ${todo.completedAt}
          )
        `;
      }

      console.log('✅ Datos migrados exitosamente');
    } else {
      console.log('\n⚠️  No hay datos para migrar');
    }

    // 4. Verificar migración
    console.log('\n🔍 Verificando migración...');
    const [result] = await sql`SELECT COUNT(*) as count FROM todos`;
    console.log(`✅ TODOs en nueva tabla: ${result.count}`);

    // 5. Listar algunos TODOs para verificar
    if (result.count > 0) {
      const samples = await sql`
        SELECT id, text, completed, created_at, completed_at
        FROM todos
        ORDER BY created_at DESC
        LIMIT 5
      `;

      console.log('\n📋 Ejemplos de TODOs migrados:');
      samples.forEach((todo: any, i: number) => {
        console.log(`  ${i + 1}. [${todo.completed ? 'x' : ' '}] ${todo.text} (${todo.id})`);
      });
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n📝 Notas:');
    console.log('  - La tabla antigua (si existía) se respaldó como "todos_old"');
    console.log('  - Puedes eliminar "todos_old" después de verificar que todo funciona correctamente');
    console.log('  - Comando para eliminar: DROP TABLE todos_old;');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateTodosToRelational();
