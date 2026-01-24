import { getStore } from "@netlify/blobs";
import { Todo, TodoListData } from "./types/todo";

const BLOB_KEY = "todos-data";

/**
 * Get Netlify Blobs store with strong consistency
 * Strong consistency ensures immediate visibility of updates
 */
function getTodoStore() {
  return getStore({
    name: "todos",
    consistency: "strong", // Critical for immediate updates
  });
}

/**
 * Fetch all todos from Netlify Blobs
 * Returns empty array if no data exists
 */
export async function getAllTodos(): Promise<TodoListData> {
  try {
    const store = getTodoStore();
    const data = await store.get(BLOB_KEY, { type: "json" });

    if (!data) {
      return { todos: [], lastModified: new Date().toISOString() };
    }

    return data as TodoListData;
  } catch (error) {
    console.error("Failed to fetch todos:", error);
    return { todos: [], lastModified: new Date().toISOString() };
  }
}

/**
 * Save todos to Netlify Blobs
 * Uses strong consistency for immediate visibility
 */
export async function saveTodos(todos: Todo[]): Promise<void> {
  const store = getTodoStore();
  const data: TodoListData = {
    todos,
    lastModified: new Date().toISOString(),
  };

  await store.setJSON(BLOB_KEY, data);
}

/**
 * Generate unique ID for new todo
 * Format: timestamp-random
 */
export function generateTodoId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
