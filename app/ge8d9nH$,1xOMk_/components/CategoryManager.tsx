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
        <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-neutral-100">
          {category.children.length > 0 && (
            <button
              onClick={() => toggleExpanded(category.id)}
              className="text-neutral-600"
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
                className="flex-1 rounded-md border border-neutral-300 bg-white px-2 py-1 text-neutral-950 outline-none focus:border-neutral-950"
                autoFocus
              />
              <button
                onClick={() => handleUpdateCategory(category.id)}
                className="rounded-md border border-neutral-950 bg-neutral-950 px-3 py-1 font-bold text-white transition-colors hover:bg-white hover:text-neutral-950"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setEditingId(null);
                  setEditingName("");
                }}
                className="rounded-md border border-neutral-300 bg-white px-3 py-1 font-bold text-neutral-950 transition-colors hover:border-neutral-950"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <span className="flex-1 text-neutral-950">{category.name}</span>
              <button
                onClick={() => {
                  setEditingId(category.id);
                  setEditingName(category.name);
                }}
                className="px-2 py-1 text-sm font-bold text-neutral-950 hover:underline"
              >
                Edit
              </button>
              <button
                onClick={() => setSelectedParentId(category.id)}
                className="px-2 py-1 text-sm font-bold text-neutral-950 hover:underline"
              >
                Add Sub
              </button>
              <button
                onClick={() => handleDeleteCategory(category.id)}
                className="px-2 py-1 text-sm font-bold text-neutral-950 hover:underline"
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
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-md border border-neutral-950 bg-white p-6">
          <p className="font-bold text-neutral-950">Loading categories...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-md border border-neutral-950 bg-white p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-black text-neutral-950">Manage Categories</h2>
          <button
            onClick={onClose}
            className="rounded-md border border-neutral-300 px-3 py-1 font-bold text-neutral-950 transition-colors hover:border-neutral-950"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-neutral-950 bg-white p-3 font-semibold text-neutral-950">
            {error}
          </div>
        )}

        <form onSubmit={handleCreateCategory} className="mb-6">
          <label className="mb-2 block text-sm font-bold text-neutral-950">
            New Category
          </label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="Category name"
              className="flex-1 rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-950 outline-none placeholder:text-neutral-500 focus:border-neutral-950"
              maxLength={100}
            />
            <select
              value={selectedParentId || ""}
              onChange={(e) => setSelectedParentId(e.target.value || null)}
              className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-950 outline-none focus:border-neutral-950"
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
              className="rounded-md border border-neutral-950 bg-neutral-950 px-4 py-2 font-bold text-white transition-colors hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
            >
              Add
            </button>
          </div>
        </form>

        <div className="border-t border-neutral-200 pt-4">
          <h3 className="mb-3 text-lg font-black text-neutral-950">Categories Tree</h3>
          {categories.length === 0 ? (
            <p className="text-neutral-500">No categories yet. Create one above!</p>
          ) : (
            <div className="space-y-1">{renderCategoryTree(categories)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
