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

interface CategoryFilterProps {
  token: string;
  selectedCategoryId: string | null;
  onFilterChange: (categoryId: string | null, descendantIds: string[]) => void;
}

export default function CategoryFilter({
  token,
  selectedCategoryId,
  onFilterChange,
}: CategoryFilterProps) {
  const [categories, setCategories] = useState<CategoryTree[]>([]);
  const [flatCategories, setFlatCategories] = useState<Array<{id: string, name: string, level: number}>>([]);
  const [loading, setLoading] = useState(true);

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
      setFlatCategories(getAllCategoriesFlat(data));
    } catch (err) {
      console.error("Failed to load categories:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAllCategoriesFlat = (
    items: CategoryTree[],
    level: number = 0
  ): Array<{id: string, name: string, level: number}> => {
    let result: Array<{id: string, name: string, level: number}> = [];
    items.forEach((item) => {
      result.push({ id: item.id, name: item.name, level });
      if (item.children.length > 0) {
        result = result.concat(getAllCategoriesFlat(item.children, level + 1));
      }
    });
    return result;
  };

  const getAllDescendantIds = (categoryId: string): string[] => {
    const findCategory = (items: CategoryTree[]): CategoryTree | null => {
      for (const item of items) {
        if (item.id === categoryId) return item;
        const found = findCategory(item.children);
        if (found) return found;
      }
      return null;
    };

    const collectIds = (item: CategoryTree): string[] => {
      let ids = [item.id];
      item.children.forEach(child => {
        ids = ids.concat(collectIds(child));
      });
      return ids;
    };

    const category = findCategory(categories);
    return category ? collectIds(category) : [];
  };

  if (loading) {
    return (
      <div className="mb-4">
        <label className="mb-2 block text-sm font-bold text-neutral-950">
          Filter by Category
        </label>
        <select disabled className="w-full rounded-md border border-neutral-300 bg-neutral-100 px-3 py-2 text-neutral-500">
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="mb-2 block text-sm font-bold text-neutral-950">
        Filter by Category
      </label>
      <select
        value={selectedCategoryId || ""}
        onChange={(e) => {
          const val = e.target.value || null;
          if (!val) {
            onFilterChange(null, []);
          } else if (val === "uncategorized") {
            onFilterChange("uncategorized", []);
          } else {
            onFilterChange(val, getAllDescendantIds(val));
          }
        }}
        className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-neutral-950 outline-none focus:border-neutral-950"
      >
        <option value="">All Categories</option>
        <option value="uncategorized">Uncategorized Only</option>
        {flatCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {"  ".repeat(cat.level)}└ {cat.name}
          </option>
        ))}
      </select>
      {selectedCategoryId && selectedCategoryId !== "uncategorized" && (
        <p className="mt-1 text-sm text-neutral-500">
          Showing this category and all subcategories
        </p>
      )}
    </div>
  );
}
