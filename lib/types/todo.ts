export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  pinned: boolean;
  createdAt: string; // ISO 8601 timestamp
  completedAt: string | null; // ISO 8601 timestamp or null
  categoryId: string | null; // Category reference or null for uncategorized
}

export interface TodoListData {
  todos: Todo[];
  lastModified: string; // ISO 8601 timestamp
}

export type SortOption = "createdAt" | "completedAt";
export type FilterOption = "all" | "active" | "completed";
