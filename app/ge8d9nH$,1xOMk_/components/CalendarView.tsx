"use client";

import CalendarManager from "./CalendarManager";

interface CalendarViewProps {
  token: string;
  onBack: () => void;
}

export default function CalendarView({ token, onBack }: CalendarViewProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100 dark:from-sky-900 dark:to-blue-800">
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <header className="mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="px-4 py-3 bg-slate-700 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-lg transition-all flex items-center gap-2"
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

            <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-sky-50">
              Calendar
            </h1>
          </div>
        </header>

        <CalendarManager token={token} />
      </div>
    </div>
  );
}
