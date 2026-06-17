"use client";

import TodoManager from "./TodoManager";

interface TodoViewProps {
  token: string;
  onBack: () => void;
}

export default function TodoView({ token, onBack }: TodoViewProps) {
  return (
    <div className="min-h-screen bg-white text-neutral-950">
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:py-10">
        <header className="mb-8 border-b border-neutral-200 pb-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                Private tools
              </p>
              <h1 className="mt-2 text-3xl font-black text-neutral-950 md:text-4xl">
                TODO Manager
              </h1>
            </div>
            <button
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-md border border-neutral-950 bg-white px-4 py-2 text-sm font-bold text-neutral-950 transition-colors hover:bg-neutral-950 hover:text-white"
              aria-label="Back to menu"
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
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">Back</span>
            </button>
          </div>
        </header>

        <TodoManager token={token} />
      </div>
    </div>
  );
}
