import { NextResponse } from "next/server";
import { validateToken } from "@/lib/auth-utils";
import { getAllTodos, saveTodos, generateTodoId } from "@/lib/todos-storage";
import { Todo } from "@/lib/types/todo";

/**
 * Extract and validate token from Authorization header or cookies
 * Pattern matches existing protected routes
 */
function validateRequest(request: Request): boolean {
  console.log("🔐 [TODOS] Validating request...");

  // Try to get token from Authorization header first
  const authHeader = request.headers.get("authorization");
  let token = authHeader?.replace("Bearer ", "");

  // If no bearer token, try to get from cookies
  if (!token) {
    const cookieHeader = request.headers.get("cookie");
    if (cookieHeader) {
      const cookies = Object.fromEntries(
        cookieHeader.split("; ").map(c => {
          const [key, ...v] = c.split("=");
          return [key, v.join("=")];
        })
      );
      token = cookies["auth_token"];
      if (token) {
        console.log("🍪 [TODOS] Using token from cookie");
      }
    }
  } else {
    console.log("🔑 [TODOS] Using Bearer token");
  }

  if (!token) {
    console.log("⚠️ [TODOS] No token provided");
    return false;
  }

  const isValid = validateToken(token);
  console.log("✓ [TODOS] Token valid:", isValid);

  return isValid;
}

/**
 * GET /api/todos - Fetch all todos
 * Requires valid Authorization token
 */
export async function GET(request: Request) {
  console.log("📋 [TODOS] GET request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [TODOS] Unauthorized GET request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    console.log("📦 [TODOS] Fetching all todos...");
    const data = await getAllTodos();
    console.log("✅ [TODOS] Todos fetched successfully:", data.todos.length, "items");

    // Explicitly set UTF-8 charset to prevent encoding issues
    return NextResponse.json(data, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
      },
    });
  } catch (error) {
    console.error("❌ [TODOS] GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/todos - Create new todo
 * Body: { text: string }
 * Requires valid Authorization token
 */
export async function POST(request: Request) {
  console.log("➕ [TODOS] POST request received");
  try {
    if (!validateRequest(request)) {
      console.log("❌ [TODOS] Unauthorized POST request");
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { text } = await request.json();

    if (!text || typeof text !== "string" || text.trim().length === 0) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 });
    }

    // Limit text length to prevent abuse
    if (text.length > 500) {
      return NextResponse.json(
        { error: "Text too long (max 500 characters)" },
        { status: 400 }
      );
    }

    const { todos } = await getAllTodos();

    // Enforce max 200 todos limit
    if (todos.length >= 200) {
      return NextResponse.json(
        { error: "Maximum todo limit reached (200)" },
        { status: 400 }
      );
    }

    const newTodo: Todo = {
      id: generateTodoId(),
      text: text.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
      completedAt: null,
    };

    const updatedTodos = [...todos, newTodo];
    await saveTodos(updatedTodos);

    return NextResponse.json(newTodo, { status: 201 });
  } catch (error) {
    console.error("POST /api/todos error:", error);
    return NextResponse.json(
      { error: "Failed to create todo" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/todos - Update existing todo
 * Body: { id: string, text?: string, completed?: boolean }
 * Requires valid Authorization token
 */
export async function PUT(request: Request) {
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id, text, completed } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    // Validate text if provided
    if (text !== undefined) {
      if (typeof text !== "string" || text.trim().length === 0) {
        return NextResponse.json(
          { error: "Text cannot be empty" },
          { status: 400 }
        );
      }
      if (text.length > 500) {
        return NextResponse.json(
          { error: "Text too long (max 500 characters)" },
          { status: 400 }
        );
      }
    }

    const { todos } = await getAllTodos();
    const todoIndex = todos.findIndex((t) => t.id === id);

    if (todoIndex === -1) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    const updatedTodo: Todo = {
      ...todos[todoIndex],
      ...(text !== undefined && { text: text.trim() }),
      ...(completed !== undefined && {
        completed,
        completedAt: completed ? new Date().toISOString() : null,
      }),
    };

    const updatedTodos = [...todos];
    updatedTodos[todoIndex] = updatedTodo;
    await saveTodos(updatedTodos);

    return NextResponse.json(updatedTodo);
  } catch (error) {
    console.error("PUT /api/todos error:", error);
    return NextResponse.json(
      { error: "Failed to update todo" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/todos - Delete todo
 * Body: { id: string }
 * Requires valid Authorization token
 */
export async function DELETE(request: Request) {
  try {
    if (!validateRequest(request)) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { id } = await request.json();

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { error: "Todo ID is required" },
        { status: 400 }
      );
    }

    const { todos } = await getAllTodos();
    const updatedTodos = todos.filter((t) => t.id !== id);

    if (updatedTodos.length === todos.length) {
      return NextResponse.json({ error: "Todo not found" }, { status: 404 });
    }

    await saveTodos(updatedTodos);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/todos error:", error);
    return NextResponse.json(
      { error: "Failed to delete todo" },
      { status: 500 }
    );
  }
}
