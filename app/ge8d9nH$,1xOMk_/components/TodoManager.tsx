"use client";

import { useState, useEffect, useRef } from "react";
import { Todo, SortOption, FilterOption } from "@/lib/types/todo";
import CategoryManager from "./CategoryManager";
import CategorySelector from "./CategorySelector";
import CategoryFilter from "./CategoryFilter";

interface TodoManagerProps {
  token: string;
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  todoId: string | null;
}

export default function TodoManager({ token }: TodoManagerProps) {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newTodoText, setNewTodoText] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("createdAt");
  const [filter, setFilter] = useState<FilterOption>("active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<string | null>(null);
  const [isFixingEncoding, setIsFixingEncoding] = useState(false);
  const [isAddingTodo, setIsAddingTodo] = useState(false);
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryFilterIds, setCategoryFilterIds] = useState<string[]>([]);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    visible: false,
    x: 0,
    y: 0,
    todoId: null,
  });
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);
  const [categoriesList, setCategoriesList] = useState<Array<{ id: string; name: string; parentId: string | null }>>([]);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadTodos();
    loadCategoriesList();
  }, [token]);

  const loadCategoriesList = async () => {
    try {
      const response = await fetch("/api/categories?flat=true", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const cats = await response.json();
        setCategoriesList(cats);
      }
    } catch (err) {
      console.error("Failed to load categories:", err);
    }
  };

  const getCategoryBreadcrumb = (categoryId: string | null): string | null => {
    if (!categoryId || categoriesList.length === 0) return null;
    const buildPath = (id: string): string | null => {
      const cat = categoriesList.find((c) => c.id === id);
      if (!cat) return null;
      if (cat.parentId) {
        const parentPath = buildPath(cat.parentId);
        return parentPath ? `${parentPath} > ${cat.name}` : cat.name;
      }
      return cat.name;
    };
    return buildPath(categoryId);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu({ visible: false, x: 0, y: 0, todoId: null });
      }
    };

    if (contextMenu.visible) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [contextMenu.visible]);

  const loadTodos = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/todos", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        setError("Session expired. Please refresh the page to login again.");
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

    setIsAddingTodo(true);
    try {
      const response = await fetch("/api/todos", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text: newTodoText, categoryId: selectedCategoryId }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || "Failed to create todo");
        return;
      }

      const newTodo = await response.json();
      setTodos([...todos, newTodo]);
      setNewTodoText("");
      setSelectedCategoryId(null);
      setError(null);
    } catch (err) {
      setError("Failed to create todo");
      console.error(err);
    } finally {
      setIsAddingTodo(false);
    }
  };

  const handleToggleComplete = async (todo: Todo) => {
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
        setTodos(todos);
        setError("Failed to update todo");
      }
    } catch (err) {
      setTodos(todos);
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleTogglePin = async (todo: Todo) => {
    const optimisticTodos = todos.map((t) =>
      t.id === todo.id ? { ...t, pinned: !t.pinned } : t
    );
    setTodos(optimisticTodos);
    setContextMenu({ visible: false, x: 0, y: 0, todoId: null });

    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: todo.id,
          pinned: !todo.pinned,
        }),
      });

      if (!response.ok) {
        setTodos(todos);
        setError("Failed to pin todo");
      }
    } catch (err) {
      setTodos(todos);
      setError("Failed to pin todo");
      console.error(err);
    }
  };

  const handleStartEdit = (todo: Todo) => {
    setEditingId(todo.id);
    setEditText(todo.text);
    setEditCategoryId(todo.categoryId);
    setContextMenu({ visible: false, x: 0, y: 0, todoId: null });
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
          categoryId: editCategoryId,
        }),
      });

      if (!response.ok) {
        setError("Failed to update todo");
        return;
      }

      const updatedTodo = await response.json();
      setTodos(todos.map((t) => (t.id === todo.id ? updatedTodo : t)));
      setEditingId(null);
      setEditCategoryId(null);
      setError(null);
    } catch (err) {
      setError("Failed to update todo");
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditText("");
    setEditCategoryId(null);
  };

  const handleDelete = async (todo: Todo) => {
    setContextMenu({ visible: false, x: 0, y: 0, todoId: null });

    if (!confirm("Delete this todo?")) return;

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
        setTodos(todos);
        setError("Failed to delete todo");
      }
    } catch (err) {
      setTodos(todos);
      setError("Failed to delete todo");
      console.error(err);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, todoId: string) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      todoId,
    });
  };

  const handleTouchStart = (e: React.TouchEvent, todoId: string) => {
    const timer = setTimeout(() => {
      const touch = e.touches[0];
      setContextMenu({
        visible: true,
        x: touch.clientX,
        y: touch.clientY,
        todoId,
      });
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const handleFixEncoding = async () => {
    if (
      !confirm(
        "Fix character encoding for all todos? This will correct garbled characters like 'ñ' showing as '├▒'."
      )
    ) {
      return;
    }

    setIsFixingEncoding(true);
    setError(null);

    try {
      const response = await fetch("/api/todos/fix-encoding", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (response.ok) {
        await loadTodos();
        alert(`✅ Fixed ${result.fixedCount} todos with encoding issues`);
      } else {
        setError(result.error || "Failed to fix encoding");
      }
    } catch (err) {
      setError("Failed to fix encoding");
      console.error(err);
    } finally {
      setIsFixingEncoding(false);
    }
  };

  const activeTodosCount = todos.filter((t) => !t.completed).length;
  const completedTodosCount = todos.filter((t) => t.completed).length;

  const filteredTodos = todos.filter((todo) => {
    // Filter by completion status
    if (filter === "active" && todo.completed) return false;
    if (filter === "completed" && !todo.completed) return false;

    // Filter by category
    if (categoryFilter === "uncategorized") {
      return todo.categoryId === null;
    }
    if (categoryFilter && categoryFilterIds.length > 0) {
      return categoryFilterIds.includes(todo.categoryId ?? "");
    }

    return true;
  });

  const sortedTodos = [...filteredTodos].sort((a, b) => {
    // Always show pinned items first
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;

    // Then sort by selected option
    if (sortBy === "createdAt") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      if (!a.completedAt && !b.completedAt) return 0;
      if (!a.completedAt) return 1;
      if (!b.completedAt) return -1;
      return (
        new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime()
      );
    }
  });

  const handleExportJSON = () => {
    const dataStr = JSON.stringify(sortedTodos, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todos-${new Date().toISOString().split("T")[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Text", "Completed", "Pinned", "Category ID", "Created At", "Completed At"];
    const rows = sortedTodos.map((todo) => [
      todo.id,
      `"${todo.text.replace(/"/g, '""')}"`,
      todo.completed ? "Yes" : "No",
      todo.pinned ? "Yes" : "No",
      todo.categoryId || "",
      todo.createdAt,
      todo.completedAt || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const dataBlob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `todos-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyToClipboard = () => {
    const text = sortedTodos
      .map((todo) => `${todo.pinned ? "📌 " : ""}${todo.completed ? "✓" : "○"} ${todo.text}`)
      .join("\n");

    navigator.clipboard.writeText(text).then(
      () => alert("✅ Copied to clipboard!"),
      () => setError("Failed to copy to clipboard")
    );
  };

  const selectedTodo = todos.find((t) => t.id === contextMenu.todoId);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Header Section */}
      <div className="bg-white dark:bg-sky-900/60 backdrop-blur-sm rounded-xl shadow-lg border-2 border-sky-200 dark:border-sky-700 p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-sky-50 mb-6">
          TODO List
        </h2>

        {/* Add Todo Form */}
        <form onSubmit={handleAddTodo} className="space-y-3 mb-6">
          <input
            type="text"
            value={newTodoText}
            onChange={(e) => setNewTodoText(e.target.value)}
            placeholder="Add new todo..."
            maxLength={500}
            className="w-full px-4 py-3 border-2 border-sky-300 dark:border-sky-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-sky-800/50 dark:text-sky-50"
          />
          <CategorySelector
            token={token}
            selectedCategoryId={selectedCategoryId}
            onSelect={setSelectedCategoryId}
          />
          <button
            type="submit"
            disabled={!newTodoText.trim() || activeTodosCount >= 200 || isAddingTodo}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAddingTodo ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Adding...
              </>
            ) : (
              `Add Todo (${activeTodosCount}/200)`
            )}
          </button>
        </form>

        {/* Category Filter */}
        <div className="mb-4">
          <CategoryFilter
            token={token}
            selectedCategoryId={categoryFilter}
            onFilterChange={(categoryId, descendantIds) => {
              setCategoryFilter(categoryId);
              setCategoryFilterIds(descendantIds);
            }}
          />
        </div>

        {/* Status Tabs */}
        <div className="flex border-b-2 border-sky-200 dark:border-sky-700 mb-4">
          <button
            onClick={() => setFilter("active")}
            className={`flex-1 py-3 font-semibold transition-colors text-sm sm:text-base ${
              filter === "active"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Active ({activeTodosCount})
          </button>
          <button
            onClick={() => setFilter("completed")}
            className={`flex-1 py-3 font-semibold transition-colors text-sm sm:text-base ${
              filter === "completed"
                ? "border-b-2 border-green-500 text-green-600 dark:text-green-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Completed ({completedTodosCount})
          </button>
          <button
            onClick={() => setFilter("all")}
            className={`flex-1 py-3 font-semibold transition-colors text-sm sm:text-base ${
              filter === "all"
                ? "border-b-2 border-purple-500 text-purple-600 dark:text-purple-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            All ({todos.length})
          </button>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col gap-3 mb-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="flex-1 px-4 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
            >
              <option value="createdAt">Sort by Created Date</option>
              <option value="completedAt">Sort by Completed Date</option>
            </select>
            <button
              onClick={() => setShowCategoryManager(true)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-all flex items-center justify-center gap-2"
              title="Manage categories"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              <span className="hidden sm:inline">Categories</span>
            </button>
            <button
              onClick={loadTodos}
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Refresh todo list"
            >
              <svg
                className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportJSON}
              disabled={sortedTodos.length === 0}
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Export filtered todos as JSON"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export JSON</span>
            </button>
            <button
              onClick={handleExportCSV}
              disabled={sortedTodos.length === 0}
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Export filtered todos as CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Export CSV</span>
            </button>
            <button
              onClick={handleCopyToClipboard}
              disabled={sortedTodos.length === 0}
              className="flex-1 px-4 py-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-400 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              title="Copy filtered todos to clipboard"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Copy</span>
            </button>
          </div>
        </div>

        {/* Fix Encoding Button */}
        {todos.some((t) =>
          /├▒|├│|├ş|├í|├ę|├║|├ü|Ã±|Ã³|Ã¡|Ã©|Ã­|Ãº|Ã/.test(t.text)
        ) && (
          <button
            onClick={handleFixEncoding}
            disabled={isFixingEncoding}
            className="w-full px-4 py-3 bg-yellow-600 hover:bg-yellow-700 disabled:bg-yellow-400 text-white rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isFixingEncoding ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Fixing...
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                  />
                </svg>
                Fix Garbled Characters (ñ, ó, etc.)
              </>
            )}
          </button>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu.visible && selectedTodo && (
        <div
          ref={contextMenuRef}
          className="fixed bg-white dark:bg-sky-800 border-2 border-sky-300 dark:border-sky-600 rounded-lg shadow-xl z-50 py-1 min-w-[200px]"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <button
            onClick={() => handleTogglePin(selectedTodo)}
            className="w-full px-4 py-2 text-left hover:bg-sky-100 dark:hover:bg-sky-700 text-slate-900 dark:text-sky-50 flex items-center gap-2"
          >
            <span className="text-lg">📌</span>
            {selectedTodo.pinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => handleStartEdit(selectedTodo)}
            className="w-full px-4 py-2 text-left hover:bg-sky-100 dark:hover:bg-sky-700 text-slate-900 dark:text-sky-50 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit
          </button>
          <button
            onClick={() => handleDelete(selectedTodo)}
            className="w-full px-4 py-2 text-left hover:bg-red-100 dark:hover:bg-red-900 text-red-600 dark:text-red-400 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )}

      {/* Todo List */}
      <div className="space-y-3">
        {loading && (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <p className="text-slate-800 dark:text-sky-50 text-lg">
                Loading todos...
              </p>
            </div>
          </div>
        )}

        {!loading && sortedTodos.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-sky-900/60 backdrop-blur-sm rounded-xl shadow-lg border-2 border-sky-200 dark:border-sky-700">
            <p className="text-slate-600 dark:text-sky-200 text-lg">
              No todos yet. Add one above!
            </p>
          </div>
        )}

        {sortedTodos.map((todo) => (
          <div
            key={todo.id}
            className={`p-4 md:p-6 rounded-xl border-2 transition-all shadow-md hover:shadow-lg ${
              todo.completed
                ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800"
                : "bg-sky-50 dark:bg-sky-800/40 border-sky-200 dark:border-sky-700"
            }`}
            onContextMenu={(e) => handleContextMenu(e, todo.id)}
            onTouchStart={(e) => handleTouchStart(e, todo.id)}
            onTouchEnd={handleTouchEnd}
            onTouchMove={handleTouchEnd}
          >
            <div className="flex items-start gap-3">
              {/* Checkbox */}
              <input
                type="checkbox"
                checked={todo.completed}
                onChange={() => handleToggleComplete(todo)}
                className="mt-1.5 w-5 h-5 cursor-pointer"
              />

              {/* Content */}
              <div className="flex-1 min-w-0">
                {editingId === todo.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                      autoFocus
                    />
                    <CategorySelector
                      token={token}
                      selectedCategoryId={editCategoryId}
                      onSelect={setEditCategoryId}
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(todo)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p
                      className={`text-base md:text-lg break-words ${
                        todo.completed
                          ? "line-through text-slate-600 dark:text-sky-300"
                          : "text-slate-900 dark:text-sky-50"
                      }`}
                    >
                      {todo.pinned && <span className="mr-2">📌</span>}
                      {todo.text}
                    </p>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-slate-600 dark:text-sky-300">
                      <span>
                        Created: {new Date(todo.createdAt).toLocaleString()}
                      </span>
                      {todo.completedAt && (
                        <span>
                          Done: {new Date(todo.completedAt).toLocaleString()}
                        </span>
                      )}
                      {todo.categoryId && getCategoryBreadcrumb(todo.categoryId) && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 rounded-full text-xs font-medium">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          {getCategoryBreadcrumb(todo.categoryId)}
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Actions - Hidden, use context menu instead */}
              {editingId !== todo.id && (
                <div className="opacity-0 pointer-events-none">
                  {/* Placeholder for layout consistency */}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <CategoryManager
          token={token}
          onClose={() => setShowCategoryManager(false)}
        />
      )}
    </div>
  );
}
