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

interface CategorySelectorProps {
  token: string;
  selectedCategoryId: string | null;
  onSelect: (categoryId: string | null) => void;
}

export default function CategorySelector({
  token,
  selectedCategoryId,
  onSelect,
}: CategorySelectorProps) {
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

  if (loading) {
    return (
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2 dark:text-slate-100">
          Category
        </label>
        <select disabled className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600">
          <option>Loading...</option>
        </select>
      </div>
    );
  }

  return (
    <div className="mb-4">
      <label className="block text-sm font-medium mb-2 dark:text-slate-100">
        Category
      </label>
      <select
        value={selectedCategoryId || ""}
        onChange={(e) => onSelect(e.target.value || null)}
        className="w-full px-3 py-2 border rounded dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
      >
        <option value="">Uncategorized</option>
        {flatCategories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {"  ".repeat(cat.level)}└ {cat.name}
          </option>
        ))}
      </select>
    </div>
  );
}
