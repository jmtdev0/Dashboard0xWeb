"use client";

import { useState, useEffect } from "react";
import { Todo, SortOption, FilterOption } from "@/lib/types/todo";

interface TodoSidebarProps {
  token: string;
  isOpen: boolean;
  onToggle: () => void;
}

export default function TodoSidebar({
  token,
  isOpen,
  onToggle,
}: TodoSidebarProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [filter, setFilter] = useState<FilterOption>("all");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");

  // Load todos on mount
  useEffect(() => {
    loadTodos();
  }, [token]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/todos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError("Session expired");
        return;
      }

      const data = await response.json();
      setTodos(data.todos || []);
      setError(null);
    } catch (err) {
      setError("Failed to load todos");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newTodoText.trim()) return;

    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newTodoText }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || "Failed to create todo");
        return;
      }

      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTodoText("");
      setError(null);
    } catch (err) {
      setError("Failed to create todo");
      console.error(err);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
    // Optimistic update
    const optimisticTodos = todos.map((t) =>
      t.id === todo.id
        ? {
            ...t,
            completed: !t.completed,
            completedAt: !t.completed ? new Date().toISOString() : null,
          }
        : t
    );
    setTodos(optimisticTodos);

    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: todo.id,
          completed: !todo.completed,
        }),
      });

      if (!response.ok) {
        // Revert on error
        setTodos(todos);
        setError("Failed to update todo");
      }
    } catch (err) {
      // Revert on error
      setTodos(todos);
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
  };

  const handleSaveEdit = async (todo: Todo) => {
    if (!editText.trim()) {
      setEditingId(null);
      return;
    }

    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: todo.id,
          text: editText,
        }),
      });

      if (!response.ok) {
        setError("Failed to update todo");
        return;
      }

      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
      setEditingId(null);
      setError(null);
    } catch (err) {
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
  };

  const handleDelete = async (todo: Todo) => {
    if (!confirm("Delete this todo?")) return;

    // Optimistic delete
    const optimisticTodos = todos.filter((t) => t.id !== todo.id);
    setTodos(optimisticTodos);

    try {
      const response = await fetch("/api/todos", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: todo.id }),
      });

      if (!response.ok) {
        // Revert on error
        setTodos(todos);
        setError("Failed to delete todo");
      }
    } catch (err) {
      // Revert on error
      setTodos(todos);
      setError("Failed to delete todo");
      console.error(err);
    }
  };

  // Filter todos
  const filteredTodos = todos.filter((todo) => {
    if (filter === "active") return !todo.completed;
    if (filter === "completed") return todo.completed;
    return true;
  });

  // Sort todos
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (sortBy === "createdAt") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Sort by completion date
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return (
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
  });

  return (
    <>
      {/* Mobile: Full overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed lg:sticky top-0 right-0 h-screen bg-white dark:bg-sky-900/60 backdrop-blur-sm border-l-2 border-sky-200 dark:border-sky-700 z-50 transition-transform duration-300 overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        } w-full lg:w-96`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-sky-900/80 backdrop-blur-sm border-b-2 border-sky-200 dark:border-sky-700 p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-900 dark:text-sky-50">
              TODO List
            </h2>
            <button
              onClick={onToggle}
              className="lg:hidden p-2 hover:bg-sky-100 dark:hover:bg-sky-800 rounded-lg transition-colors"
              aria-label="Close sidebar"
            >
              <svg
                className="w-6 h-6 text-slate-900 dark:text-sky-50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Add Todo Form */}
          <form onSubmit={handleAddTodo} className="space-y-2">
            <input
              type="text"
              value={newTodoText}
              onChange={(e) => setNewTodoText(e.target.value)}
              placeholder="Add new todo..."
              maxLength={500}
              className="w-full px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-sky-800/50 dark:text-sky-50 text-sm"
            />
            <button
              type="submit"
              disabled={!newTodoText.trim() || todos.length >= 200}
              className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed text-sm"
            >
              Add Todo ({todos.length}/200)
            </button>
          </form>

          {/* Filters */}
          <div className="flex gap-2 mt-4">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as FilterOption)}
              className="flex-1 px-2 py-1 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50 text-sm"
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 px-2 py-1 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50 text-sm"
            >
              <option value="createdAt">By Created</option>
              <option value="completedAt">By Completed</option>
            </select>
          </div>

          {error && (
            <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}
        </div>

        {/* Todo List */}
        <div className="p-4 space-y-2">
          {loading && (
            <div className="text-center py-8">
              <div className="animate-pulse">
                <p className="text-slate-800 dark:text-sky-50 text-sm">
                  Loading todos...
                </p>
              </div>
            </div>
          )}

          {!loading && sortedTodos.length === 0 && (
            <div className="text-center py-8">
              <p className="text-slate-600 dark:text-sky-200 text-sm">
                No todos yet. Add one above!
              </p>
            </div>
          )}

          {sortedTodos.map((todo) => (
            <div
              key={todo.id}
              className={`p-3 rounded-lg border-2 transition-all ${
                todo.completed
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                  : "bg-sky-50 dark:bg-sky-800/40 border-sky-200 dark:border-sky-700"
              }`}
            >
              <div className="flex items-start gap-2">
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={todo.completed}
                  onChange={() => handleToggleComplete(todo)}
                  className="mt-1 w-4 h-4 cursor-pointer"
                />

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full px-2 py-1 border-2 border-sky-300 dark:border-sky-700 rounded dark:bg-sky-800/50 dark:text-sky-50 text-sm"
                        autoFocus
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit(todo)}
                          className="flex-1 px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 px-2 py-1 bg-slate-400 hover:bg-slate-500 text-white rounded text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <p
                        className={`text-sm break-words ${
                          todo.completed
                            ? "line-through text-slate-600 dark:text-sky-300"
                            : "text-slate-900 dark:text-sky-50"
                        }`}
                      >
                        {todo.text}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-600 dark:text-sky-300">
                        <span>
                          Created: {new Date(todo.createdAt).toLocaleDateString()}
                        </span>
                        {todo.completedAt && (
                          <span>
                            Done: {new Date(todo.completedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                {editingId !== todo.id && (
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStartEdit(todo)}
                      className="p-1 hover:bg-sky-200 dark:hover:bg-sky-700 rounded transition-colors"
                      aria-label="Edit"
                    >
                      <svg
                        className="w-4 h-4 text-slate-700 dark:text-sky-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(todo)}
                      className="p-1 hover:bg-red-200 dark:hover:bg-red-900 rounded transition-colors"
                      aria-label="Delete"
                    >
                      <svg
                        className="w-4 h-4 text-red-600 dark:text-red-400"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
