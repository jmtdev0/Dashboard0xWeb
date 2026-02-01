import { getAllTodos } from '../lib/todos-storage';

async function testTodosStorage() {
  console.log('🧪 Testing todos-storage.ts...\n');

  try {
    const result = await getAllTodos();

    console.log('📊 Result from getAllTodos():');
    console.log('  - todos count:', result.todos.length);
    console.log('  - lastModified:', result.lastModified);
    console.log('\n📋 TODOs:');

    result.todos.forEach((todo, i) => {
      const status = todo.completed ? '✅' : '⬜';
      console.log(`${i + 1}. ${status} ${todo.text}`);
      console.log(`   ID: ${todo.id}`);
      console.log(`   Created: ${todo.createdAt}`);
      if (todo.completedAt) {
        console.log(`   Completed: ${todo.completedAt}`);
      }
      console.log();
    });

    console.log('✅ Test completed successfully!');
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testTodosStorage();
