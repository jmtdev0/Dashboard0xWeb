"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Todo } from "@/lib/types/todo";

type Category = {
  id: string;
  name: string;
  parentId: string | null;
};

export default function TodoIssuePage() {
  const params = useParams<{ number: string }>();
  const router = useRouter();
  const todoNumber = Number(params.number);
  const [token, setToken] = useState<string | null>(null);
  const [todo, setTodo] = useState<Todo | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [description, setDescription] = useState("");
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadIssue = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const authResponse = await fetch("/api/auth/check");
        const auth = await authResponse.json();

        if (!auth.valid || !auth.token) {
          router.push("/ge8d9nH$,1xOMk_");
          return;
        }

        setToken(auth.token);

        const [todosResponse, categoriesResponse] = await Promise.all([
          fetch("/api/todos", {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
          fetch("/api/categories?flat=true", {
            headers: { Authorization: `Bearer ${auth.token}` },
          }),
        ]);

        if (!todosResponse.ok) {
          throw new Error("Failed to load todo");
        }

        const data = await todosResponse.json();
        const foundTodo = (data.todos || []).find(
          (item: Todo) => item.todoNumber === todoNumber
        );

        if (!foundTodo) {
          setError(`TODO #${params.number} was not found.`);
          return;
        }

        setTodo(foundTodo);
        setDescription(foundTodo.description || "");

        if (categoriesResponse.ok) {
          setCategories(await categoriesResponse.json());
        }
      } catch (err) {
        setError("Failed to load TODO detail");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    loadIssue();
  }, [params.number, router, todoNumber]);

  const categoryBreadcrumb = useMemo(() => {
    if (!todo?.categoryId || categories.length === 0) return "Uncategorized";

    const buildPath = (id: string): string | null => {
      const category = categories.find((item) => item.id === id);
      if (!category) return null;

      if (category.parentId) {
        const parentPath = buildPath(category.parentId);
        return parentPath ? `${parentPath} > ${category.name}` : category.name;
      }

      return category.name;
    };

    return buildPath(todo.categoryId) ?? "Uncategorized";
  }, [categories, todo]);

  const handleSaveDescription = async () => {
    if (!todo || !token) return;

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/todos", {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: todo.id, description }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to save description");
      }

      const updatedTodo = await response.json();
      setTodo(updatedTodo);
      setDescription(updatedTodo.description || "");
      setIsEditingDescription(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save description");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="mb-8 border-b border-neutral-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Private TODO issue
              </p>
              <h1 className="mt-2 text-3xl font-black text-neutral-950 md:text-4xl">
                TODO #{params.number}
              </h1>
            </div>
            <button
              onClick={() => router.push("/ge8d9nH$,1xOMk_")}
              className="inline-flex items-center justify-center rounded-md border border-neutral-950 bg-white px-4 py-2 text-sm font-bold text-neutral-950 transition-colors hover:bg-neutral-950 hover:text-white"
            >
              Back to list
            </button>
          </div>
        </header>

        {isLoading && (
          <div className="rounded-md border border-neutral-200 bg-neutral-50 p-8 text-center font-bold text-neutral-600">
            Loading TODO...
          </div>
        )}

        {!isLoading && error && (
          <div className="rounded-md border border-neutral-950 bg-white p-4 font-bold">
            {error}
          </div>
        )}

        {!isLoading && todo && (
          <main className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <section className="rounded-md border border-neutral-200 bg-neutral-50 p-5 sm:p-6">
              <div className="mb-6 border-b border-neutral-200 pb-5">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-sm font-black text-neutral-700">
                    #{todo.todoNumber}
                  </span>
                  {todo.pinned && (
                    <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-sm font-bold">
                      Pinned
                    </span>
                  )}
                  <span className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-sm font-bold">
                    {todo.completed ? "Completed" : "Active"}
                  </span>
                </div>
                <h2 className="whitespace-pre-wrap break-words text-2xl font-black leading-tight md:text-3xl">
                  {todo.text}
                </h2>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-lg font-black">Description</h3>
                  {!isEditingDescription && (
                    <button
                      onClick={() => setIsEditingDescription(true)}
                      className="rounded-md border border-neutral-300 bg-white px-3 py-1 text-sm font-bold transition-colors hover:border-neutral-950"
                    >
                      Edit
                    </button>
                  )}
                </div>

                {isEditingDescription ? (
                  <div className="space-y-3">
                    <textarea
                      value={description}
                      onChange={(event) => setDescription(event.target.value)}
                      className="min-h-[280px] w-full resize-y rounded-md border border-neutral-300 bg-white px-4 py-3 text-neutral-950 outline-none focus:border-neutral-950"
                      placeholder="Write a description for this issue..."
                      maxLength={10000}
                      autoFocus
                    />
                    <div className="flex flex-col gap-2 sm:flex-row">
                      <button
                        onClick={handleSaveDescription}
                        disabled={isSaving}
                        className="rounded-md border border-neutral-950 bg-neutral-950 px-4 py-2 font-bold text-white transition-colors hover:bg-white hover:text-neutral-950 disabled:cursor-not-allowed disabled:border-neutral-300 disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        {isSaving ? "Saving..." : "Save description"}
                      </button>
                      <button
                        onClick={() => {
                          setDescription(todo.description || "");
                          setIsEditingDescription(false);
                        }}
                        disabled={isSaving}
                        className="rounded-md border border-neutral-300 bg-white px-4 py-2 font-bold transition-colors hover:border-neutral-950 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="min-h-[220px] rounded-md border border-neutral-200 bg-white p-4">
                    {todo.description ? (
                      <p className="whitespace-pre-wrap break-words leading-relaxed">
                        {todo.description}
                      </p>
                    ) : (
                      <button
                        onClick={() => setIsEditingDescription(true)}
                        className="text-left font-bold text-neutral-500 hover:text-neutral-950"
                      >
                        No description yet. Add one.
                      </button>
                    )}
                  </div>
                )}
              </div>
            </section>

            <aside className="space-y-3">
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Category</p>
                <p className="mt-1 font-bold">{categoryBreadcrumb}</p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Created</p>
                <p className="mt-1 font-bold">
                  {new Date(todo.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Completed</p>
                <p className="mt-1 font-bold">
                  {todo.completedAt
                    ? new Date(todo.completedAt).toLocaleString()
                    : "Not completed"}
                </p>
              </div>
              <div className="rounded-md border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Internal ID</p>
                <p className="mt-1 break-all font-mono text-sm">{todo.id}</p>
              </div>
            </aside>
          </main>
        )}
      </div>
    </div>
  );
}
