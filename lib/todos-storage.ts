import { neon } from "@netlify/neon";
import { Todo, TodoListData } from "./types/todo";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_TODOS_FILE = path.join(LOCAL_DATA_DIR, "todos-data.json");

/**
 * Check if we can use Netlify DB
 */
function canUseDatabase(): boolean {
  return !!(
    process.env.NETLIFY_DATABASE_URL ||
    process.env.NETLIFY ||
    process.env.NETLIFY_DEV
  );
}

/**
 * Check if we're running in local development WITHOUT Netlify DB
 * When running with `netlify dev`, we want to use Netlify DB (same as production)
 */
function isLocalDevelopment(): boolean {
  // Log for debugging
  console.log("🔍 [TODO STORAGE] Environment check:", {
    NETLIFY: process.env.NETLIFY,
    NODE_ENV: process.env.NODE_ENV,
    NETLIFY_DEV: process.env.NETLIFY_DEV,
    HAS_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
  });

  // If NETLIFY or NETLIFY_DEV is set, we're running with netlify dev or in production
  // Only use local file storage when running pure Next.js dev server without database
  const useLocalFile = !canUseDatabase() && process.env.NODE_ENV !== "production";
  console.log("🔍 [TODO STORAGE] Use local file:", useLocalFile);
  return useLocalFile;
}

/**
 * Ensure local data directory exists
 */
async function ensureLocalDataDir(): Promise<void> {
  try {
    await fs.mkdir(LOCAL_DATA_DIR, { recursive: true });
  } catch (error) {
    console.error("Failed to create local data directory:", error);
  }
}

/**
 * Fetch all todos from Netlify DB or local file system
 * Returns empty TodoListData if no data exists
 */
export async function getAllTodos(): Promise<TodoListData> {
  console.log("📋 [TODO STORAGE] Fetching todos...");

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [TODO STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_TODOS_FILE, "utf-8");
      const parsed = JSON.parse(data) as TodoListData;
      console.log("✅ [TODO STORAGE] Todos loaded from local file:", parsed.todos.length, "items");
      return parsed;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [TODO STORAGE] No local todos file found, creating empty list");
        return { todos: [], lastModified: new Date().toISOString() };
      }
      console.error("❌ [TODO STORAGE] Failed to read local file:", error);
      return { todos: [], lastModified: new Date().toISOString() };
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [TODO STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    // Fetch all todos from database
    const rows = await sql`
      SELECT
        id,
        text,
        completed,
        created_at as "createdAt",
        completed_at as "completedAt"
      FROM todos
      ORDER BY created_at DESC
    `;

    // Map database rows to Todo objects
    const todos: Todo[] = rows.map((row: any) => ({
      id: row.id,
      text: row.text,
      completed: row.completed,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
    }));

    // Get last modified from most recent update
    const [lastUpdate] = await sql`
      SELECT MAX(updated_at) as last_modified FROM todos
    `;

    const lastModified = lastUpdate?.last_modified || new Date().toISOString();

    console.log("✅ [TODO STORAGE] Todos fetched successfully:", todos.length, "items");
    return { todos, lastModified };
  } catch (error) {
    console.error("❌ [TODO STORAGE] Failed to fetch todos:", error);
    return { todos: [], lastModified: new Date().toISOString() };
  }
}

/**
 * Save todos to Netlify DB or local file system
 * The database trigger ensures only the most recent record is kept
 */
export async function saveTodos(todos: Todo[]): Promise<void> {
  console.log("💾 [TODO STORAGE] Saving todos...", todos.length, "items");

  const data: TodoListData = {
    todos,
    lastModified: new Date().toISOString(),
  };

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [TODO STORAGE] Using local file system (development mode)");
    try {
      await ensureLocalDataDir();
      await fs.writeFile(
        LOCAL_TODOS_FILE,
        JSON.stringify(data, null, 2),
        "utf-8"
      );
      console.log("✅ [TODO STORAGE] Todos saved to local file:", LOCAL_TODOS_FILE);
      return;
    } catch (error) {
      console.error("❌ [TODO STORAGE] Failed to save to local file:", error);
      throw error;
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [TODO STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    // Get current TODO IDs from the array
    const todoIds = todos.map((t) => t.id);

    // Upsert each TODO (insert or update if exists)
    for (const todo of todos) {
      await sql`
        INSERT INTO todos (id, text, completed, created_at, completed_at)
        VALUES (
          ${todo.id},
          ${todo.text},
          ${todo.completed},
          ${todo.createdAt},
          ${todo.completedAt}
        )
        ON CONFLICT (id) DO UPDATE SET
          text = EXCLUDED.text,
          completed = EXCLUDED.completed,
          completed_at = EXCLUDED.completed_at
      `;
    }

    // Delete TODOs that are no longer in the array
    if (todoIds.length > 0) {
      await sql`
        DELETE FROM todos
        WHERE NOT (id = ANY(${todoIds}))
      `;
    } else {
      // If no TODOs in array, delete all
      await sql`DELETE FROM todos`;
    }

    console.log("✅ [TODO STORAGE] Todos saved successfully to database");
  } catch (error) {
    console.error("❌ [TODO STORAGE] Failed to save todos:", error);
    throw error;
  }
}

/**
 * Generate unique ID for new todo
 * Format: timestamp-random
 */
export function generateTodoId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
