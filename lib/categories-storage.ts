import { neon } from "@netlify/neon";
import { Category, CategoryTree } from "./types/category";
import { promises as fs } from "fs";
import path from "path";

const LOCAL_DATA_DIR = path.join(process.cwd(), ".local-data");
const LOCAL_CATEGORIES_FILE = path.join(LOCAL_DATA_DIR, "categories-data.json");

// User ID for authentication - in production this would come from auth token
const USER_ID = "default-user";

/**
 * Check if we can use Netlify DB
 */
function canUseDatabase(): boolean {
  const hasDbUrl = !!process.env.NETLIFY_DATABASE_URL;
  console.log("🔍 [CATEGORY STORAGE] Can use database:", hasDbUrl);
  return hasDbUrl;
}

/**
 * Check if we're running in local development WITHOUT Netlify DB
 */
function isLocalDevelopment(): boolean {
  console.log("🔍 [CATEGORY STORAGE] Environment check:", {
    NETLIFY: process.env.NETLIFY,
    NODE_ENV: process.env.NODE_ENV,
    NETLIFY_DEV: process.env.NETLIFY_DEV,
    HAS_DATABASE_URL: !!process.env.NETLIFY_DATABASE_URL,
  });

  const useLocalFile = !canUseDatabase() && process.env.NODE_ENV !== "production";
  console.log("🔍 [CATEGORY STORAGE] Use local file:", useLocalFile);
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
 * Build tree structure from flat category list
 */
function buildCategoryTree(categories: Category[]): CategoryTree[] {
  const categoryMap = new Map<string, CategoryTree>();
  const rootCategories: CategoryTree[] = [];

  // First pass: create all nodes
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] });
  });

  // Second pass: build tree structure
  categories.forEach(category => {
    const node = categoryMap.get(category.id)!;
    if (category.parentId === null) {
      rootCategories.push(node);
    } else {
      const parent = categoryMap.get(category.parentId);
      if (parent) {
        parent.children.push(node);
      } else {
        // If parent not found, treat as root
        rootCategories.push(node);
      }
    }
  });

  return rootCategories;
}

/**
 * Get all categories for a user as a tree structure
 */
export async function getAllCategories(userId: string = USER_ID): Promise<CategoryTree[]> {
  console.log("📁 [CATEGORY STORAGE] Fetching categories for user:", userId);

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [CATEGORY STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_CATEGORIES_FILE, "utf-8");
      const categories = JSON.parse(data) as Category[];
      console.log("✅ [CATEGORY STORAGE] Categories loaded from local file:", categories.length, "items");
      return buildCategoryTree(categories);
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [CATEGORY STORAGE] No local categories file found, returning empty list");
        return [];
      }
      console.error("❌ [CATEGORY STORAGE] Failed to read local file:", error);
      return [];
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [CATEGORY STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const rows = await sql`
      SELECT
        id,
        name,
        parent_id as "parentId",
        user_id as "userId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM categories
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `;

    const categories: Category[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    console.log("✅ [CATEGORY STORAGE] Categories fetched successfully:", categories.length, "items");
    return buildCategoryTree(categories);
  } catch (error) {
    console.error("❌ [CATEGORY STORAGE] Failed to fetch categories:", error);
    return [];
  }
}

/**
 * Get all categories as flat list (useful for dropdowns)
 */
export async function getAllCategoriesFlat(userId: string = USER_ID): Promise<Category[]> {
  console.log("📁 [CATEGORY STORAGE] Fetching flat categories for user:", userId);

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [CATEGORY STORAGE] Using local file system (development mode)");
    try {
      const data = await fs.readFile(LOCAL_CATEGORIES_FILE, "utf-8");
      const categories = JSON.parse(data) as Category[];
      console.log("✅ [CATEGORY STORAGE] Categories loaded from local file:", categories.length, "items");
      return categories;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        console.log("⚠️ [CATEGORY STORAGE] No local categories file found, returning empty list");
        return [];
      }
      console.error("❌ [CATEGORY STORAGE] Failed to read local file:", error);
      return [];
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [CATEGORY STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const rows = await sql`
      SELECT
        id,
        name,
        parent_id as "parentId",
        user_id as "userId",
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM categories
      WHERE user_id = ${userId}
      ORDER BY created_at ASC
    `;

    const categories: Category[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      parentId: row.parentId,
      userId: row.userId,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    console.log("✅ [CATEGORY STORAGE] Categories fetched successfully:", categories.length, "items");
    return categories;
  } catch (error) {
    console.error("❌ [CATEGORY STORAGE] Failed to fetch categories:", error);
    return [];
  }
}

/**
 * Create a new category
 */
export async function createCategory(
  name: string,
  parentId: string | null = null,
  userId: string = USER_ID
): Promise<Category> {
  console.log("➕ [CATEGORY STORAGE] Creating category:", name);

  const newCategory: Category = {
    id: generateCategoryId(),
    name: name.trim(),
    parentId,
    userId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [CATEGORY STORAGE] Using local file system (development mode)");
    try {
      await ensureLocalDataDir();
      const categories = await getAllCategoriesFlat(userId);
      categories.push(newCategory);
      await fs.writeFile(
        LOCAL_CATEGORIES_FILE,
        JSON.stringify(categories, null, 2),
        "utf-8"
      );
      console.log("✅ [CATEGORY STORAGE] Category saved to local file");
      return newCategory;
    } catch (error) {
      console.error("❌ [CATEGORY STORAGE] Failed to save to local file:", error);
      throw error;
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [CATEGORY STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    await sql`
      INSERT INTO categories (id, name, parent_id, user_id, created_at, updated_at)
      VALUES (
        ${newCategory.id},
        ${newCategory.name},
        ${newCategory.parentId},
        ${newCategory.userId},
        ${newCategory.createdAt},
        ${newCategory.updatedAt}
      )
    `;

    console.log("✅ [CATEGORY STORAGE] Category created successfully");
    return newCategory;
  } catch (error) {
    console.error("❌ [CATEGORY STORAGE] Failed to create category:", error);
    throw error;
  }
}

/**
 * Update a category name
 */
export async function updateCategory(
  id: string,
  name: string,
  userId: string = USER_ID
): Promise<Category | null> {
  console.log("✏️ [CATEGORY STORAGE] Updating category:", id);

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [CATEGORY STORAGE] Using local file system (development mode)");
    try {
      const categories = await getAllCategoriesFlat(userId);
      const categoryIndex = categories.findIndex(c => c.id === id && c.userId === userId);

      if (categoryIndex === -1) {
        console.log("⚠️ [CATEGORY STORAGE] Category not found");
        return null;
      }

      categories[categoryIndex].name = name.trim();
      categories[categoryIndex].updatedAt = new Date().toISOString();

      await fs.writeFile(
        LOCAL_CATEGORIES_FILE,
        JSON.stringify(categories, null, 2),
        "utf-8"
      );

      console.log("✅ [CATEGORY STORAGE] Category updated in local file");
      return categories[categoryIndex];
    } catch (error) {
      console.error("❌ [CATEGORY STORAGE] Failed to update local file:", error);
      throw error;
    }
  }

  // Use Netlify DB in production
  console.log("☁️ [CATEGORY STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const result = await sql`
      UPDATE categories
      SET name = ${name.trim()}, updated_at = NOW()
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING
        id,
        name,
        parent_id as "parentId",
        user_id as "userId",
        created_at as "createdAt",
        updated_at as "updatedAt"
    `;

    if (result.length === 0) {
      console.log("⚠️ [CATEGORY STORAGE] Category not found");
      return null;
    }

    const updated: Category = {
      id: result[0].id,
      name: result[0].name,
      parentId: result[0].parentId,
      userId: result[0].userId,
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    };

    console.log("✅ [CATEGORY STORAGE] Category updated successfully");
    return updated;
  } catch (error) {
    console.error("❌ [CATEGORY STORAGE] Failed to update category:", error);
    throw error;
  }
}

/**
 * Delete a category (and all its subcategories via CASCADE)
 */
export async function deleteCategory(id: string, userId: string = USER_ID): Promise<boolean> {
  console.log("🗑️ [CATEGORY STORAGE] Deleting category:", id);

  // Use local file system in development
  if (isLocalDevelopment()) {
    console.log("🏠 [CATEGORY STORAGE] Using local file system (development mode)");
    try {
      const categories = await getAllCategoriesFlat(userId);
      const initialLength = categories.length;

      // Find all descendants recursively
      const findDescendants = (parentId: string): string[] => {
        const children = categories.filter(c => c.parentId === parentId);
        let descendants = children.map(c => c.id);
        children.forEach(child => {
          descendants = descendants.concat(findDescendants(child.id));
        });
        return descendants;
      };

      const toDelete = [id, ...findDescendants(id)];
      const filtered = categories.filter(c => !toDelete.includes(c.id) || c.userId !== userId);

      if (filtered.length === initialLength) {
        console.log("⚠️ [CATEGORY STORAGE] Category not found");
        return false;
      }

      await fs.writeFile(
        LOCAL_CATEGORIES_FILE,
        JSON.stringify(filtered, null, 2),
        "utf-8"
      );

      console.log("✅ [CATEGORY STORAGE] Category and descendants deleted from local file");
      return true;
    } catch (error) {
      console.error("❌ [CATEGORY STORAGE] Failed to delete from local file:", error);
      throw error;
    }
  }

  // Use Netlify DB in production (CASCADE will handle subcategories)
  console.log("☁️ [CATEGORY STORAGE] Using Netlify DB (production mode)");
  try {
    const sql = neon();

    const result = await sql`
      DELETE FROM categories
      WHERE id = ${id} AND user_id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) {
      console.log("⚠️ [CATEGORY STORAGE] Category not found");
      return false;
    }

    console.log("✅ [CATEGORY STORAGE] Category deleted successfully (CASCADE handled subcategories)");
    return true;
  } catch (error) {
    console.error("❌ [CATEGORY STORAGE] Failed to delete category:", error);
    throw error;
  }
}

/**
 * Generate unique ID for new category
 */
export function generateCategoryId(): string {
  return `cat-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}
