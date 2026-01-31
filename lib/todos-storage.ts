import { getStore } from "@netlify/blobs";
import { Todo, TodoListData } from "./types/todo";
import { promises as fs } from "fs";
import path from "path";

const BLOB_KEY = "todos-data";
const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_TODOS_FILE = path.join(LOCAL_DATA_DIR, "todos-data.json");

/**
 * Check if we're running in local development (no Netlify Blobs available)
 */
function isLocalDevelopment(): boolean {
  return !process.env.NETLIFY && process.env.NODE_ENV !== "production";
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
 * Fetch all todos from Netlify Blobs or local file system
 * Returns empty array if no data exists
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

  // Use Netlify Blobs in production
  console.log("☁️ [TODO STORAGE] Using Netlify Blobs (production mode)");
  try {
    const store = getTodoStore();
    const data = await store.get(BLOB_KEY, { type: "json" });

    if (!data) {
      console.log("⚠️ [TODO STORAGE] No todos found in blob store");
      return { todos: [], lastModified: new Date().toISOString() };
    }

    console.log("✅ [TODO STORAGE] Todos fetched successfully");
    return data as TodoListData;
  } catch (error) {
    console.error("❌ [TODO STORAGE] Failed to fetch todos:", error);
    return { todos: [], lastModified: new Date().toISOString() };
  }
}

/**
 * Save todos to Netlify Blobs or local file system
 * Uses strong consistency for immediate visibility
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

  // Use Netlify Blobs in production
  console.log("☁️ [TODO STORAGE] Using Netlify Blobs (production mode)");
  try {
    const store = getTodoStore();
    await store.setJSON(BLOB_KEY, data);
    console.log("✅ [TODO STORAGE] Todos saved successfully to blob store");
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
