"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface CategoryTree extends Category {
  children: CategoryTree[];
}

interface CategoryManagerProps {
  token: string;
  onClose: () => void;
}

export default function CategoryManager({ token, onClose }: CategoryManagerProps) {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch categories");
      }

      const data = await response.json();
      setCategories(data);
      setError(null);
    } catch (err) {
      setError("Failed to load categories");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newCategoryName,
          parentId: selectedParentId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || "Failed to create category");
        return;
      }

      setNewCategoryName("");
      setSelectedParentId(null);
      await loadCategories();
      setError(null);
    } catch (err) {
      setError("Failed to create category");
      console.error(err);
    }
  };

  const handleUpdateCategory = async (id: string) => {
    if (!editingName.trim()) return;

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: editingName }),
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || "Failed to update category");
        return;
      }

      setEditingId(null);
      setEditingName("");
      await loadCategories();
      setError(null);
    } catch (err) {
      setError("Failed to update category");
      console.error(err);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!confirm("Delete this category and all its subcategories?")) {
      return;
    }

    try {
      const response = await fetch(`/api/categories/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const error = await response.json();
        setError(error.error || "Failed to delete category");
        return;
      }

      await loadCategories();
      setError(null);
    } catch (err) {
      setError("Failed to delete category");
      console.error(err);
    }
  };

  const toggleExpanded = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const renderCategoryTree = (items: CategoryTree[], level: number = 0) => {
    return items.map((category) => (
      <div key={category.id} style={{ marginLeft: `${level * 20}px` }}>
        <div className="flex items-center gap-2 py-2 px-3 hover:bg-slate-100 dark:hover:bg-slate-700 rounded">
          {category.children.length > 0 && (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="text-slate-600 dark:text-slate-400"
            >
              {expandedIds.has(category.id) ? "▼" : "▶"}
            </button>
          )}

          {editingId === category.id ? (
            <div className="flex-1 flex gap-2">
              <input
                type="text"
                value={editingName}
                onChange={(e) => setEditingName(e.target.value)}
                className="flex-1 px-2 py-1 border rounded dark:bg-slate-800 dark:border-slate-600"
                autoFocus
              />
              <button
                onClick={() => handleUpdateCategory(category.id)}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingName("");
                }}
                className="px-3 py-1 bg-slate-400 text-white rounded hover:bg-slate-500"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 dark:text-slate-100">{category.name}</span>
              <button
                onClick={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                }}
                className="px-2 py-1 text-sm text-blue-600 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => setSelectedParentId(category.id)}
                className="px-2 py-1 text-sm text-green-600 hover:underline"
              >
                Add Sub
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="px-2 py-1 text-sm text-red-600 hover:underline"
              >
                Delete
              </button>
            </>
          )}
        </div>

        {expandedIds.has(category.id) && category.children.length > 0 && (
          <div>{renderCategoryTree(category.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  const getAllCategoriesFlat = (items: CategoryTree[], level: number = 0): Array<{id: string, name: string, level: number}> => {
    let result: Array<{id: string, name: string, level: number}> = [];
    items.forEach(item => {
      result.push({ id: item.id, name: item.name, level });
      if (item.children.length > 0) {
        result = result.concat(getAllCategoriesFlat(item.children, level + 1));
      }
    });
    return result;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
          <p className="dark:text-slate-100">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-slate-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold dark:text-slate-100">Manage Categories</h2>
          <button
            onClick={onClose}
            className="text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateCategory} className="mb-6">
          <label className="block text-sm font-medium mb-2 dark:text-slate-100">
            New Category
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
              maxLength={100}
            />
            <select
              value={selectedParentId || ""}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              className="px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
            >
              <option value="">Root Level</option>
              {getAllCategoriesFlat(categories).map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {"  ".repeat(cat.level)}└ {cat.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              disabled={!newCategoryName.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-blue-400"
            >
              Add
            </button>
          </div>
        </form>

        <div className="border-t pt-4 dark:border-slate-600">
          <h3 className="text-lg font-semibold mb-3 dark:text-slate-100">Categories Tree</h3>
          {categories.length === 0 ? (
            <p className="text-slate-500 dark:text-slate-400">No categories yet. Create one above!</p>
          ) : (
            <div className="space-y-1">{renderCategoryTree(categories)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
