import { timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getAllTodos } from "@/lib/todos-storage";
import type { Todo } from "@/lib/types/todo";

export const dynamic = "force-dynamic";

type TodoStatusFilter = "all" | "active" | "completed";

const VALID_STATUS_FILTERS = new Set<TodoStatusFilter>([
  "all",
  "active",
  "completed",
]);

function extractApiKey(request: Request): string | null {
  const authHeader = request.headers.get("authorization");

  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length).trim();
  }

  return request.headers.get("x-api-key")?.trim() || null;
}

function keysMatch(candidate: string, expected: string): boolean {
  const candidateBuffer = Buffer.from(candidate, "utf-8");
  const expectedBuffer = Buffer.from(expected, "utf-8");

  if (candidateBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(candidateBuffer, expectedBuffer);
}

function validateApiKey(request: Request): boolean {
  const configuredKey = process.env.TODOS_API_KEY;
  const providedKey = extractApiKey(request);

  if (!configuredKey || !providedKey) {
    return false;
  }

  return keysMatch(providedKey, configuredKey);
}

function parseStatusFilter(request: Request): TodoStatusFilter | null {
  const url = new URL(request.url);
  const status = (url.searchParams.get("status") || "all").toLowerCase();

  if (VALID_STATUS_FILTERS.has(status as TodoStatusFilter)) {
    return status as TodoStatusFilter;
  }

  return null;
}

function filterTodos(todos: Todo[], status: TodoStatusFilter): Todo[] {
  if (status === "active") {
    return todos.filter((todo) => !todo.completed);
  }

  if (status === "completed") {
    return todos.filter((todo) => todo.completed);
  }

  return todos;
}

export async function GET(request: Request) {
  if (!process.env.TODOS_API_KEY) {
    console.error("[INTEGRATIONS TODOS] TODOS_API_KEY is not configured");
    return NextResponse.json(
      { error: "Server configuration error" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!validateApiKey(request)) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const status = parseStatusFilter(request);

  if (!status) {
    return NextResponse.json(
      { error: "Invalid status filter. Use all, active, or completed." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const data = await getAllTodos();
    const todos = filterTodos(data.todos, status);

    return NextResponse.json(
      {
        todos,
        count: todos.length,
        status,
        lastModified: data.lastModified,
      },
      {
        headers: {
          "Cache-Control": "no-store",
          "Content-Type": "application/json; charset=utf-8",
        },
      }
    );
  } catch (error) {
    console.error("[INTEGRATIONS TODOS] Failed to fetch todos:", error);
    return NextResponse.json(
      { error: "Failed to fetch todos" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
