import { neon } from '@netlify/neon';
import { readFileSync } from 'fs';
import { join } from 'path';

async function migrateLocalData() {
  try {
    const sql = neon();

    console.log('🔄 Iniciando migración de datos locales → Netlify DB...\n');

    const LOCAL_DATA_DIR = join(process.cwd(), '.local-data');

    // 1. Migrar Dashboard Data
    console.log('📊 Migrando dashboard data desde archivo local...');
    try {
      const dashboardPath = join(LOCAL_DATA_DIR, 'dashboard-data.json');
      const dashboardData = JSON.parse(readFileSync(dashboardPath, 'utf-8'));

      await sql`
        INSERT INTO dashboard (data)
        VALUES (${JSON.stringify(dashboardData)})
      `;
      console.log('✅ Dashboard data migrado exitosamente');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  No hay dashboard data local para migrar');
      } else {
        console.error('❌ Error migrando dashboard data:', error);
      }
    }

    // 2. Migrar TODOs Data
    console.log('\n📝 Migrando todos data desde archivo local...');
    try {
      const todosPath = join(LOCAL_DATA_DIR, 'todos-data.json');
      const todosData = JSON.parse(readFileSync(todosPath, 'utf-8'));

      await sql`
        INSERT INTO todos (data)
        VALUES (${JSON.stringify(todosData)})
      `;
      console.log('✅ TODOs data migrado exitosamente');
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        console.log('⚠️  No hay todos data local para migrar');
      } else {
        console.error('❌ Error migrando todos data:', error);
      }
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
    console.log('\n📌 Nota: Estos datos fueron migrados desde archivos locales.');
    console.log('   Para migrar desde Netlify Blobs en producción, usa "npm run db:migrate" con netlify dev.');
  } catch (error) {
    console.error('❌ Error durante la migración:', error);
    process.exit(1);
  }
}

migrateLocalData();
