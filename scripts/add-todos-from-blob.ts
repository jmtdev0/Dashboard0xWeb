import { neon } from '@netlify/neon';

// Helper para generar ID único
function generateTodoId(timestamp: Date): string {
  return `${timestamp.getTime()}-${Math.random().toString(36).substring(2, 9)}`;
}

async function addTodosFromBlob() {
  try {
    const sql = neon();

    console.log('📝 Añadiendo TODOs desde blob a la base de datos...\n');

    const todos = [
      {
        text: '18chescoXX',
        createdAt: new Date('2026-02-01T12:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Red Social para que las IA hablen entre ellas',
        createdAt: new Date('2026-01-30T12:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Juego Android Final Fantasy que está ubicado en localidades Madrid Sur y pelees contra autobuses siendo la 485 el final boss',
        createdAt: new Date('2026-01-27T12:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Investigar servidor Claude al que pueda llamar en cualquier momento',
        createdAt: new Date('2026-01-26T12:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'En un workflow de GitHub, crear un vídeo bonito tranquilo con clips de cottonbrostudio y música y subirlo a YouTube.',
        createdAt: new Date('2026-01-26T11:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: '¿Me estoy volviendo loco?',
        createdAt: new Date('2026-01-26T10:00:00Z'),
        completed: true,
        completedAt: new Date('2026-01-27T12:00:00Z'),
      },
      {
        text: 'En DashboardOxMobile, permitir acceso durante un mes después de hacer login. Si la sesión caduca, mostrar la pantalla de login.',
        createdAt: new Date('2026-01-26T09:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Darle permiso a Claude en los repositorios en la rama develop (en main no para no gastar deploys a lo loco en Netlify)',
        createdAt: new Date('2026-01-25T12:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Hola, soy Android',
        createdAt: new Date('2026-01-25T11:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Añadir una sección de tareas prioritarias / pinnear',
        createdAt: new Date('2026-01-25T10:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Cargar en el Dashboard cositas recientes',
        createdAt: new Date('2026-01-25T09:00:00Z'),
        completed: false,
        completedAt: null,
      },
      {
        text: 'Que funcione el Dashboard en Web y App',
        createdAt: new Date('2026-01-25T08:00:00Z'),
        completed: false,
        completedAt: null,
      },
    ];

    console.log(`Insertando ${todos.length} TODOs...\n`);

    for (const todo of todos) {
      const id = generateTodoId(todo.createdAt);

      await sql`
        INSERT INTO todos (id, text, completed, created_at, completed_at)
        VALUES (
          ${id},
          ${todo.text},
          ${todo.completed},
          ${todo.createdAt.toISOString()},
          ${todo.completedAt?.toISOString() || null}
        )
        ON CONFLICT (id) DO NOTHING
      `;

      const status = todo.completed ? '✅' : '⬜';
      console.log(`${status} ${todo.text.substring(0, 60)}...`);
    }

    console.log('\n✅ TODOs añadidos exitosamente!');

    // Verificar
    const [result] = await sql`SELECT COUNT(*) as count FROM todos`;
    console.log(`\n📊 Total de TODOs en la base de datos: ${result.count}`);

    // Mostrar los TODOs recientes
    const recent = await sql`
      SELECT text, completed, created_at, completed_at
      FROM todos
      ORDER BY created_at DESC
      LIMIT 5
    `;

    console.log('\n📋 TODOs más recientes:');
    recent.forEach((todo: any, i: number) => {
      const status = todo.completed ? '✅' : '⬜';
      const date = new Date(todo.created_at).toLocaleDateString('es-ES');
      console.log(`  ${i + 1}. ${status} ${todo.text.substring(0, 50)}... (${date})`);
    });
  } catch (error) {
    console.error('❌ Error al añadir TODOs:', error);
    process.exit(1);
  }
}

addTodosFromBlob();
