"use client";

interface SelectionScreenProps {
  onSelectCrypto: () => void;
  onSelectTodos: () => void;
  onSelectCalendar: () => void;
}

export default function SelectionScreen({
  onSelectCrypto,
  onSelectTodos,
  onSelectCalendar,
}: SelectionScreenProps) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-300 via-sky-200 to-blue-100 dark:from-sky-900 dark:to-blue-800 flex flex-col lg:flex-row">
      {/* Crypto Dashboard */}
      <button
        onClick={onSelectCrypto}
        className="flex-1 min-h-[33.33vh] lg:min-h-screen group relative overflow-hidden transition-all hover:flex-[1.05] focus:outline-none focus:ring-4 focus:ring-blue-500 focus:ring-inset"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/20 to-sky-600/30 dark:from-blue-700/40 dark:to-sky-800/50 group-hover:from-blue-500/30 group-hover:to-sky-600/40 dark:group-hover:from-blue-700/50 dark:group-hover:to-sky-800/60 transition-all duration-300" />

        {/* Divider */}
        <div className="absolute bottom-0 lg:bottom-auto lg:right-0 w-full lg:w-1 h-1 lg:h-full bg-gradient-to-r lg:bg-gradient-to-b from-blue-400 to-sky-500 dark:from-blue-600 dark:to-sky-700" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl lg:text-8xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
            🔐
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-sky-50 mb-4 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
            Crypto Dashboard
          </h2>
          <p className="text-lg md:text-xl text-slate-700 dark:text-sky-200 max-w-md group-hover:text-slate-900 dark:group-hover:text-sky-100 transition-colors">
            View Bitcoin and Solana price indicators
          </p>
          <div className="mt-8 text-blue-600 dark:text-blue-400 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </button>

      {/* TODO Manager */}
      <button
        onClick={onSelectTodos}
        className="flex-1 min-h-[33.33vh] lg:min-h-screen group relative overflow-hidden transition-all hover:flex-[1.05] focus:outline-none focus:ring-4 focus:ring-sky-500 focus:ring-inset"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-sky-500/20 to-blue-600/30 dark:from-sky-700/40 dark:to-blue-800/50 group-hover:from-sky-500/30 group-hover:to-blue-600/40 dark:group-hover:from-sky-700/50 dark:group-hover:to-blue-800/60 transition-all duration-300" />

        {/* Divider */}
        <div className="absolute bottom-0 lg:bottom-auto lg:right-0 w-full lg:w-1 h-1 lg:h-full bg-gradient-to-r lg:bg-gradient-to-b from-sky-400 to-emerald-500 dark:from-sky-600 dark:to-emerald-700" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl lg:text-8xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
            ✓
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-sky-50 mb-4 group-hover:text-sky-700 dark:group-hover:text-sky-300 transition-colors">
            TODO Manager
          </h2>
          <p className="text-lg md:text-xl text-slate-700 dark:text-sky-200 max-w-md group-hover:text-slate-900 dark:group-hover:text-sky-100 transition-colors">
            Manage your tasks and to-do list
          </p>
          <div className="mt-8 text-sky-600 dark:text-sky-400 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </button>

      {/* Calendar */}
      <button
        onClick={onSelectCalendar}
        className="flex-1 min-h-[33.33vh] lg:min-h-screen group relative overflow-hidden transition-all hover:flex-[1.05] focus:outline-none focus:ring-4 focus:ring-emerald-500 focus:ring-inset"
      >
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-600/30 dark:from-emerald-700/40 dark:to-teal-800/50 group-hover:from-emerald-500/30 group-hover:to-teal-600/40 dark:group-hover:from-emerald-700/50 dark:group-hover:to-teal-800/60 transition-all duration-300" />

        {/* Content */}
        <div className="relative h-full flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl lg:text-8xl mb-6 transform group-hover:scale-110 transition-transform duration-300">
            📅
          </div>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-slate-900 dark:text-sky-50 mb-4 group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">
            Calendar
          </h2>
          <p className="text-lg md:text-xl text-slate-700 dark:text-sky-200 max-w-md group-hover:text-slate-900 dark:group-hover:text-sky-100 transition-colors">
            Manage your events and schedule
          </p>
          <div className="mt-8 text-emerald-600 dark:text-emerald-400 animate-bounce">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
        </div>
      </button>
    </div>
  );
}
