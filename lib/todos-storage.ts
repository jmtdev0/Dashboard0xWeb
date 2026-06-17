import { neon } from "@netlify/neon";
import { Todo, TodoListData } from "./types/todo";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_TODOS_FILE = path.join(LOCAL_DATA_DIR, "todos-data.json");

type StoredTodo = Omit<Todo, "todoNumber"> & { todoNumber?: number | null };
type TodoRow = {
  id: string;
  todoNumber: number;
  text: string;
  completed: boolean;
  pinned: boolean;
  createdAt: string;
  completedAt: string | null;
  categoryId: string | null;
};
type LegacyTodoRow = Omit<TodoRow, "todoNumber">;

let todoNumberColumnReady = false;

function normalizeTodosWithNumbers(todos: StoredTodo[]): Todo[] {
  const usedNumbers = new Set<number>();
  let nextNumber = 1;

  const getNextNumber = () => {
    while (usedNumbers.has(nextNumber)) {
      nextNumber += 1;
    }
    usedNumbers.add(nextNumber);
    return nextNumber;
  };

  return [...todos]
    .sort(
      (a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
        a.id.localeCompare(b.id)
    )
    .map((todo) => {
      const existingNumber =
        typeof todo.todoNumber === "number" &&
        Number.isInteger(todo.todoNumber) &&
        todo.todoNumber > 0 &&
        !usedNumbers.has(todo.todoNumber)
          ? todo.todoNumber
          : getNextNumber();

      usedNumbers.add(existingNumber);
      return { ...todo, todoNumber: existingNumber };
    })
    .sort(
      (a, b) =>
        Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) ||
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function getNextTodoNumber(todos: Todo[]): number {
  return todos.reduce((max, todo) => Math.max(max, todo.todoNumber), 0) + 1;
}

function mapTodoRows(rows: TodoRow[]): Todo[] {
  return rows.map((row) => ({
    id: row.id,
    todoNumber: row.todoNumber,
    text: row.text,
    completed: row.completed,
    pinned: row.pinned,
    createdAt: row.createdAt,
    completedAt: row.completedAt,
    categoryId: row.categoryId,
  }));
}

function mapLegacyTodoRows(rows: LegacyTodoRow[]): Todo[] {
  return normalizeTodosWithNumbers(
    rows.map((row) => ({
      id: row.id,
      text: row.text,
      completed: row.completed,
      pinned: row.pinned,
      createdAt: row.createdAt,
      completedAt: row.completedAt,
      categoryId: row.categoryId,
    }))
  );
}

async function ensureTodoNumberColumn(sql: ReturnType<typeof neon>): Promise<void> {
  if (todoNumberColumnReady) return;

  await sql`ALTER TABLE todos ADD COLUMN IF NOT EXISTS todo_number INTEGER`;
  await sql`
    WITH numbered AS (
      SELECT
        id,
        (
          COALESCE((SELECT MAX(todo_number) FROM todos WHERE todo_number IS NOT NULL), 0)
          + ROW_NUMBER() OVER (ORDER BY created_at ASC, id ASC)
        )::INTEGER AS next_number
      FROM todos
      WHERE todo_number IS NULL
    )
    UPDATE todos
    SET todo_number = numbered.next_number
    FROM numbered
    WHERE todos.id = numbered.id
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_todos_number_unique ON todos(todo_number)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_todos_number ON todos(todo_number ASC)`;

  todoNumberColumnReady = true;
}

/**
 * Check if we can use Netlify DB
 * CRITICAL: Only return true if NETLIFY_DATABASE_URL is actually present
 */
function canUseDatabase(): boolean {
  const hasDbUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log("🔍 [TODO STORAGE] Can use database:", hasDbUrl);
  return hasDbUrl;
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

  // Only use local file storage when database is not available
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
      const todos = normalizeTodosWithNumbers(parsed.todos);
      console.log("✅ [TODO STORAGE] Todos loaded from local file:", todos.length, "items");
      return { ...parsed, todos };
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
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
    await ensureTodoNumberColumn(sql);

    // Fetch all todos from database
    const rows = await sql`
      SELECT
        id,
        text,
        todo_number as "todoNumber",
        completed,
        pinned,
        created_at as "createdAt",
        completed_at as "completedAt",
        category_id as "categoryId"
      FROM todos
      ORDER BY pinned DESC, created_at DESC
    `;

    // Map database rows to Todo objects
    const todos = mapTodoRows(rows as TodoRow[]);

    // Get last modified from most recent update
    const [lastUpdate] = await sql`
      SELECT MAX(updated_at) as last_modified FROM todos
    `;

    const lastModified = lastUpdate?.last_modified || new Date().toISOString();

    console.log("✅ [TODO STORAGE] Todos fetched successfully:", todos.length, "items");
    return { todos, lastModified };
  } catch (error) {
    console.error("❌ [TODO STORAGE] Failed to fetch todos:", error);
    try {
      const sql = neon();
      const rows = await sql`
        SELECT
          id,
          text,
          completed,
          pinned,
          created_at as "createdAt",
          completed_at as "completedAt",
          category_id as "categoryId"
        FROM todos
        ORDER BY pinned DESC, created_at DESC
      `;
      const todos = mapLegacyTodoRows(rows as LegacyTodoRow[]);
      console.log("✅ [TODO STORAGE] Legacy fallback fetched todos:", todos.length, "items");
      return { todos, lastModified: new Date().toISOString() };
    } catch (fallbackError) {
      console.error("❌ [TODO STORAGE] Legacy fallback failed:", fallbackError);
    }
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
    await ensureTodoNumberColumn(sql);

    // Get current TODO IDs from the array
    const todoIds = todos.map((t) => t.id);

    // Upsert each TODO (insert or update if exists)
    for (const todo of todos) {
      await sql`
        INSERT INTO todos (id, todo_number, text, completed, pinned, created_at, completed_at, category_id)
        VALUES (
          ${todo.id},
          ${todo.todoNumber},
          ${todo.text},
          ${todo.completed},
          ${todo.pinned},
          ${todo.createdAt},
          ${todo.completedAt},
          ${todo.categoryId}
        )
        ON CONFLICT (id) DO UPDATE SET
          todo_number = EXCLUDED.todo_number,
          text = EXCLUDED.text,
          completed = EXCLUDED.completed,
          pinned = EXCLUDED.pinned,
          completed_at = EXCLUDED.completed_at,
          category_id = EXCLUDED.category_id
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
