"use client";

import { useState, useEffect } from "react";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CalendarManagerProps {
  token: string;
}

type ViewMode = "upcoming" | "month";

export default function CalendarManager({ token }: CalendarManagerProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("upcoming");
  const [currentMonth, setCurrentMonth] = useState(new Date());

  // Add event form
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editDescription, setEditDescription] = useState("");

  useEffect(() => {
    loadEvents();
  }, [token]);

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/events", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch events");
      const data = await response.json();
      setEvents(data.events || []);
    } catch (err) {
      setError("Failed to load events");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDate) return;

    setIsAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          date: newDate,
          description: newDescription || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create event");
      }

      setNewTitle("");
      setNewDate("");
      setNewDescription("");
      await loadEvents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDelete = async (event: CalendarEvent) => {
    if (!confirm(`Delete "${event.title}"?`)) return;

    setError(null);
    try {
      const response = await fetch("/api/events", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ id: event.id }),
      });

      if (!response.ok) throw new Error("Failed to delete event");
      await loadEvents();
    } catch (err) {
      setError("Failed to delete event");
      console.error(err);
    }
  };

  const handleStartEdit = (event: CalendarEvent) => {
    setEditingId(event.id);
    setEditTitle(event.title);
    setEditDate(new Date(event.date).toISOString().split("T")[0]);
    setEditDescription(event.description || "");
  };

  const handleSaveEdit = async (event: CalendarEvent) => {
    if (!editTitle.trim() || !editDate) return;

    setError(null);
    try {
      const response = await fetch("/api/events", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          id: event.id,
          title: editTitle,
          date: editDate,
          description: editDescription || null,
        }),
      });

      if (!response.ok) throw new Error("Failed to update event");
      setEditingId(null);
      await loadEvents();
    } catch (err) {
      setError("Failed to update event");
      console.error(err);
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
  };

  // Helpers
  const getDaysUntil = (dateStr: string): number => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(dateStr);
    eventDate.setHours(0, 0, 0, 0);
    return Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  };

  const getDaysLabel = (days: number): string => {
    if (days === 0) return "Today";
    if (days === 1) return "Tomorrow";
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
    return `In ${days} day${days !== 1 ? "s" : ""}`;
  };

  const upcomingEvents = [...events]
    .filter((e) => getDaysUntil(e.date) >= 0)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const pastEvents = [...events]
    .filter((e) => getDaysUntil(e.date) < 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Month grid helpers
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const getEventsForDay = (day: number): CalendarEvent[] => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter((e) => {
      const eventDate = new Date(e.date);
      const eventStr = `${eventDate.getFullYear()}-${String(eventDate.getMonth() + 1).padStart(2, "0")}-${String(eventDate.getDate()).padStart(2, "0")}`;
      return eventStr === dateStr;
    });
  };

  const isToday = (day: number): boolean => {
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    );
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(year, month + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Add Event Form */}
      <div className="bg-white dark:bg-sky-900/60 backdrop-blur-sm rounded-xl shadow-lg border-2 border-sky-200 dark:border-sky-700 p-6 mb-6">
        <h2 className="text-2xl font-bold text-slate-900 dark:text-sky-50 mb-6">
          Events
        </h2>

        <form onSubmit={handleAddEvent} className="space-y-3 mb-6">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Event title..."
            maxLength={200}
            className="w-full px-4 py-3 border-2 border-sky-300 dark:border-sky-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-sky-800/50 dark:text-sky-50"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="flex-1 px-4 py-3 border-2 border-sky-300 dark:border-sky-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-sky-800/50 dark:text-sky-50"
            />
            <input
              type="text"
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Description (optional)"
              maxLength={1000}
              className="flex-1 px-4 py-3 border-2 border-sky-300 dark:border-sky-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 dark:bg-sky-800/50 dark:text-sky-50"
            />
          </div>
          <button
            type="submit"
            disabled={!newTitle.trim() || !newDate || isAdding}
            className="w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isAdding ? (
              <>
                <svg
                  className="animate-spin h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Adding...
              </>
            ) : (
              `Add Event (${events.length}/100)`
            )}
          </button>
        </form>

        {/* View Mode Tabs */}
        <div className="flex border-b-2 border-sky-200 dark:border-sky-700 mb-4">
          <button
            onClick={() => setViewMode("upcoming")}
            className={`flex-1 py-3 font-semibold transition-colors text-sm sm:text-base ${
              viewMode === "upcoming"
                ? "border-b-2 border-emerald-500 text-emerald-600 dark:text-emerald-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Upcoming ({upcomingEvents.length})
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`flex-1 py-3 font-semibold transition-colors text-sm sm:text-base ${
              viewMode === "month"
                ? "border-b-2 border-blue-500 text-blue-600 dark:text-blue-400"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            Month View
          </button>
        </div>

        {/* Refresh button */}
        <div className="flex justify-end mb-4">
          <button
            onClick={loadEvents}
            disabled={loading}
            className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold rounded-lg transition-all disabled:cursor-not-allowed flex items-center gap-2"
            title="Refresh events"
          >
            <svg
              className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}
      </div>

      {/* Content Area */}
      {loading && (
        <div className="text-center py-12">
          <div className="animate-pulse">
            <p className="text-slate-800 dark:text-sky-50 text-lg">
              Loading events...
            </p>
          </div>
        </div>
      )}

      {/* Upcoming Events View */}
      {!loading && viewMode === "upcoming" && (
        <div className="space-y-3">
          {upcomingEvents.length === 0 && pastEvents.length === 0 && (
            <div className="text-center py-12 bg-white dark:bg-sky-900/60 backdrop-blur-sm rounded-xl shadow-lg border-2 border-sky-200 dark:border-sky-700">
              <p className="text-slate-600 dark:text-sky-200 text-lg">
                No events yet. Add one above!
              </p>
            </div>
          )}

          {/* Upcoming events */}
          {upcomingEvents.map((event) => {
            const days = getDaysUntil(event.date);
            const isUrgent = days <= 7;

            return (
              <div
                key={event.id}
                className={`p-4 md:p-6 rounded-xl border-2 transition-all shadow-md hover:shadow-lg ${
                  isUrgent
                    ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700"
                    : "bg-sky-50 dark:bg-sky-800/40 border-sky-200 dark:border-sky-700"
                }`}
              >
                {editingId === event.id ? (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                      autoFocus
                    />
                    <div className="flex flex-col sm:flex-row gap-3">
                      <input
                        type="date"
                        value={editDate}
                        onChange={(e) => setEditDate(e.target.value)}
                        className="flex-1 px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                      />
                      <input
                        type="text"
                        value={editDescription}
                        onChange={(e) => setEditDescription(e.target.value)}
                        placeholder="Description (optional)"
                        className="flex-1 px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEdit(event)}
                        className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                      >
                        Save
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="flex-1 px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-semibold"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-3 mb-2">
                        <h3 className="text-base md:text-lg font-semibold text-slate-900 dark:text-sky-50 break-words">
                          {event.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            days === 0
                              ? "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                              : isUrgent
                                ? "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300"
                                : "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300"
                          }`}
                        >
                          {getDaysLabel(days)}
                        </span>
                      </div>
                      {event.description && (
                        <p className="text-sm text-slate-600 dark:text-sky-300 mb-2 break-words">
                          {event.description}
                        </p>
                      )}
                      <p className="text-sm text-slate-500 dark:text-sky-400">
                        {new Date(event.date).toLocaleDateString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleStartEdit(event)}
                        className="p-2 text-slate-500 hover:text-blue-600 dark:text-sky-400 dark:hover:text-blue-400 transition-colors"
                        title="Edit event"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDelete(event)}
                        className="p-2 text-slate-500 hover:text-red-600 dark:text-sky-400 dark:hover:text-red-400 transition-colors"
                        title="Delete event"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Past events section */}
          {pastEvents.length > 0 && (
            <>
              <div className="pt-4">
                <h3 className="text-lg font-semibold text-slate-500 dark:text-sky-400 mb-3">
                  Past Events
                </h3>
              </div>
              {pastEvents.map((event) => {
                const days = getDaysUntil(event.date);

                return (
                  <div
                    key={event.id}
                    className="p-4 md:p-6 rounded-xl border-2 transition-all shadow-md hover:shadow-lg bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 opacity-75"
                  >
                    {editingId === event.id ? (
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className="w-full px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                          autoFocus
                        />
                        <div className="flex flex-col sm:flex-row gap-3">
                          <input
                            type="date"
                            value={editDate}
                            onChange={(e) => setEditDate(e.target.value)}
                            className="flex-1 px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                          />
                          <input
                            type="text"
                            value={editDescription}
                            onChange={(e) => setEditDescription(e.target.value)}
                            placeholder="Description (optional)"
                            className="flex-1 px-3 py-2 border-2 border-sky-300 dark:border-sky-700 rounded-lg dark:bg-sky-800/50 dark:text-sky-50"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveEdit(event)}
                            className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold"
                          >
                            Save
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="flex-1 px-4 py-2 bg-slate-400 hover:bg-slate-500 text-white rounded-lg font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-3 mb-2">
                            <h3 className="text-base md:text-lg font-semibold text-slate-600 dark:text-slate-300 break-words">
                              {event.title}
                            </h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-400">
                              {getDaysLabel(days)}
                            </span>
                          </div>
                          {event.description && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-2 break-words">
                              {event.description}
                            </p>
                          )}
                          <p className="text-sm text-slate-400 dark:text-slate-500">
                            {new Date(event.date).toLocaleDateString("en-US", {
                              weekday: "long",
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                            })}
                          </p>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <button
                            onClick={() => handleStartEdit(event)}
                            className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                            title="Edit event"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(event)}
                            className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                            title="Delete event"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Month View */}
      {!loading && viewMode === "month" && (
        <div className="bg-white dark:bg-sky-900/60 backdrop-blur-sm rounded-xl shadow-lg border-2 border-sky-200 dark:border-sky-700 p-4 md:p-6">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-800 transition-colors"
              title="Previous month"
            >
              <svg className="w-6 h-6 text-slate-700 dark:text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-center">
              <h3 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-sky-50">
                {currentMonth.toLocaleString("en-US", { month: "long", year: "numeric" })}
              </h3>
              <button
                onClick={goToToday}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline mt-1"
              >
                Go to today
              </button>
            </div>

            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-sky-100 dark:hover:bg-sky-800 transition-colors"
              title="Next month"
            >
              <svg className="w-6 h-6 text-slate-700 dark:text-sky-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Day Headers */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div
                key={day}
                className="text-center font-semibold text-sm p-2 text-slate-600 dark:text-sky-300"
              >
                <span className="hidden sm:inline">{day}</span>
                <span className="sm:hidden">{day[0]}</span>
              </div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1">
            {/* Empty cells before first day */}
            {Array.from({ length: firstDayOfMonth }, (_, i) => (
              <div key={`empty-${i}`} className="p-1 sm:p-2 min-h-[40px] sm:min-h-[70px]" />
            ))}

            {/* Day cells */}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1;
              const dayEvents = getEventsForDay(day);
              const isTodayCell = isToday(day);

              return (
                <div
                  key={day}
                  className={`p-1 sm:p-2 border rounded min-h-[40px] sm:min-h-[70px] transition-colors ${
                    isTodayCell
                      ? "bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-600 ring-2 ring-blue-400"
                      : "border-sky-200 dark:border-sky-700 hover:bg-sky-50 dark:hover:bg-sky-800/30"
                  }`}
                >
                  <div
                    className={`font-medium text-xs sm:text-sm mb-0.5 ${
                      isTodayCell
                        ? "text-blue-700 dark:text-blue-300 font-bold"
                        : "text-slate-700 dark:text-sky-200"
                    }`}
                  >
                    {day}
                  </div>
                  {dayEvents.map((evt) => (
                    <div
                      key={evt.id}
                      className="text-[10px] sm:text-xs bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded px-1 py-0.5 mt-0.5 truncate cursor-default"
                      title={`${evt.title}${evt.description ? ` - ${evt.description}` : ""}`}
                    >
                      {evt.title}
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
