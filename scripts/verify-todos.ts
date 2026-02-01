import { neon } from '@netlify/neon';

async function verifyTodos() {
  const sql = neon();

  // Ver todos los TODOs
  const todos = await sql`
    SELECT id, text, completed,
           created_at,
           completed_at
    FROM todos
    ORDER BY created_at DESC
  `;

  console.log('📋 Todos los TODOs en la base de datos:\n');
  todos.forEach((todo: any, i: number) => {
    const status = todo.completed ? '✅' : '⬜';
    const created = new Date(todo.created_at).toLocaleDateString('es-ES');
    const completedInfo = todo.completed_at
      ? ` (Done: ${new Date(todo.completed_at).toLocaleDateString('es-ES')})`
      : '';
    console.log(`${i+1}. ${status} ${todo.text}`);
    console.log(`   Created: ${created}${completedInfo}`);
    console.log();
  });

  // Estadísticas
  const [stats] = await sql`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE completed) as completados,
      COUNT(*) FILTER (WHERE NOT completed) as activos
    FROM todos
  `;

  console.log('📊 Estadísticas:');
  console.log(`   Total: ${stats.total}`);
  console.log(`   Activos: ${stats.activos}`);
  console.log(`   Completados: ${stats.completados}`);
}

verifyTodos();
