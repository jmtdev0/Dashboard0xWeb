import { neon } from '@netlify/neon';
import { getStore } from '@netlify/blobs';

async function migrateData() {
  try {
    const sql = neon();

    console.log('🔄 Iniciando migración de Netlify Blobs → Netlify DB...\n');

    // 1. Migrar Dashboard Data
    console.log('📊 Migrando dashboard data...');
    try {
      const dashboardStore = getStore({ name: 'dashboard', consistency: 'strong' });
      const dashboardData = await dashboardStore.get('dashboard-data', { type: 'json' });

      if (dashboardData) {
        await sql`
          INSERT INTO dashboard (data)
          VALUES (${JSON.stringify(dashboardData)})
        `;
        console.log('✅ Dashboard data migrado exitosamente');
      } else {
        console.log('⚠️  No hay dashboard data para migrar');
      }
    } catch (error) {
      console.error('❌ Error migrando dashboard data:', error);
    }

    // 2. Migrar TODOs Data
    console.log('\n📝 Migrando todos data...');
    try {
      const todosStore = getStore({ name: 'todos', consistency: 'strong' });
      const todosData = await todosStore.get('todos-data', { type: 'json' });

      if (todosData) {
        await sql`
          INSERT INTO todos (data)
          VALUES (${JSON.stringify(todosData)})
        `;
        console.log('✅ TODOs data migrado exitosamente');
      } else {
        console.log('⚠️  No hay todos data para migrar');
      }
    } catch (error) {
      console.error('❌ Error migrando todos data:', error);
    }

    // 3. Verificar migración
    console.log('\n🔍 Verificando migración...');
    const [dashboardRow] = await sql`SELECT * FROM dashboard ORDER BY created_at DESC LIMIT 1`;
    const [todosRow] = await sql`SELECT * FROM todos ORDER BY created_at DESC LIMIT 1`;

    console.log('\nResultados de la migración:');
    console.log('============================');
    console.log('Dashboard record:', dashboardRow ? '✅ Existe' : '❌ No encontrado');
    console.log('Todos record:', todosRow ? '✅ Existe' : '❌ No encontrado');

    if (dashboardRow) {
      console.log('\nDashboard Data Details:');
      console.log('  - Timestamp:', dashboardRow.data.timestamp);
      console.log('  - Created at:', dashboardRow.created_at);
      console.log('  - Updated at:', dashboardRow.updated_at);
    }

    if (todosRow) {
      const todosCount = todosRow.data.todos?.length || 0;
      console.log('\nTODOs Data Details:');
      console.log('  - TODOs count:', todosCount);
      console.log('  - Last modified:', todosRow.data.lastModified);
      console.log('  - Created at:', todosRow.created_at);
      console.log('  - Updated at:', todosRow.updated_at);
    }

    console.log('\n✅ Migración completada exitosamente!');
    console.log('\n⚠️  IMPORTANTE: No olvides hacer "claim" de tu database en los primeros 7 días!');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateData();
