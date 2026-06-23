"use client";

import { useEffect, useMemo, useState } from "react";
import { MusicController } from "@/app/components/music-controller";
import { ProjectMap3D } from "@/app/components/project-map-3d";
import { ProjectMapPlayroom } from "@/app/components/project-map-playroom";
import {
  ProjectMapSimple,
  SIMPLE_CATEGORY_STYLES,
} from "@/app/components/project-map-simple";
import {
  CATEGORY_STYLES,
  STATUS_STYLES,
  buildProjectNodes,
  metricToneClass,
  toPublicDashboardData,
  type CategoryId,
  type DashboardResponse,
  type DataState,
  type ProjectNode,
  type PublicDashboardData,
} from "@/lib/public-project-map";
import { MUSIC_TRACKS } from "@/lib/music-tracks";

const DASHBOARD_VISUALIZATIONS = [
  "simple",
  "crystarium",
  "playroom",
] as const;

type DashboardVisualization = (typeof DASHBOARD_VISUALIZATIONS)[number];

export default function Dashboard() {
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [legacyActiveCategory, setLegacyActiveCategory] =
    useState<CategoryId | null>(null);
  const [openCategories, setOpenCategories] = useState<Set<CategoryId>>(
    () => new Set()
  );
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visualization, setVisualization] =
    useState<DashboardVisualization>("simple");

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    setVisualization(resolveVisualization(window.location.search));
  }, []);

  const dataState: DataState = data ? "ready" : error ? "error" : "loading";
  const nodes = useMemo(
    () => buildProjectNodes(data?.results ?? null, dataState),
    [data?.results, dataState]
  );
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? null;

  const handleLegacyToggleCategory = (category: CategoryId) => {
    setLegacyActiveCategory((current) =>
      current === category ? null : category
    );
    setSelectedNodeId(null);
  };

  const handleSimpleToggleCategory = (category: CategoryId) => {
    setOpenCategories((current) => {
      const next = new Set(current);

      if (next.has(category)) {
        next.delete(category);
        if (selectedNode?.category === category) {
          setSelectedNodeId(null);
        }
      } else {
        next.add(category);
      }

      return next;
    });
  };

  const loadData = async () => {
    setInitialLoading(true);

    try {
      const response = await fetch("/api/results");
      const payload = (await response.json()) as DashboardResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to load data");
      }

      const publicData = toPublicDashboardData(payload);

      if (publicData) {
        setData(publicData);
        setError(null);
      } else {
        setData(null);
        setError(payload.message || "No data available yet");
      }
    } catch (err) {
      console.error("Failed to load public dashboard data:", err);
      setData(null);
      setError(err instanceof Error ? err.message : "Failed to load data");
    } finally {
      setInitialLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    setError(null);

    try {
      const response = await fetch("/api/scrape", {
        method: "POST",
      });
      const payload = (await response.json()) as DashboardResponse;

      if (!response.ok) {
        throw new Error(payload.error || "Failed to refresh data");
      }

      const publicData = toPublicDashboardData(payload);

      if (publicData) {
        setData(publicData);
      } else {
        setError(payload.message || "Refresh completed without public data");
      }
    } catch (err) {
      console.error("Failed to refresh public dashboard data:", err);
      setError(err instanceof Error ? err.message : "Failed to refresh data");
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div
      className={`relative min-h-screen overflow-hidden text-slate-100 ${
        visualization === "simple"
          ? "bg-[#9a6048] dark:bg-[#1f120d]"
          : "bg-[#020617] dark:bg-black"
      }`}
    >
      {visualization !== "simple" && (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(168,85,247,0.24),transparent_34%),radial-gradient(circle_at_17%_24%,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(59,130,246,0.18),transparent_30%)]" />
      )}

      {error && (
        <div
          role="alert"
          className="pointer-events-auto fixed left-4 right-20 top-5 z-30 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100 backdrop-blur-md sm:left-6 sm:max-w-xl lg:left-8"
        >
          {error}
        </div>
      )}

      <>
          <button
            onClick={handleRefresh}
            disabled={initialLoading || refreshing}
            aria-label={
              initialLoading
                ? "Loading dashboard data"
                : refreshing
                  ? "Refreshing dashboard data"
                  : "Refresh dashboard data"
            }
            title={
              initialLoading
                ? "Loading"
                : refreshing
                  ? "Refreshing"
                  : "Refresh Now"
            }
            className={`fixed right-4 top-5 z-40 grid h-12 w-12 place-items-center rounded-lg border shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 lg:right-8 ${
              visualization === "simple"
                ? "border-[#321a12]/35 bg-[#321a12]/85 text-[#ffe9cf] hover:bg-[#321a12]"
                : "border-blue-300/30 bg-blue-500/15 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.18)] hover:border-blue-300/60 hover:bg-blue-500/25"
            }`}
          >
            <RefreshIcon spinning={refreshing || initialLoading} />
          </button>

          <main className="fixed inset-0 z-10">
            {visualization === "simple" ? (
              <ProjectMapSimple
                nodes={nodes}
                openCategories={openCategories}
                selectedNodeId={selectedNodeId}
                onToggleCategory={handleSimpleToggleCategory}
                onSelectNode={setSelectedNodeId}
              />
            ) : visualization === "crystarium" ? (
              <ProjectMap3D
                nodes={nodes}
                activeCategory={legacyActiveCategory}
                selectedNodeId={selectedNodeId}
                onToggleCategory={handleLegacyToggleCategory}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <ProjectMapPlayroom
                nodes={nodes}
                activeCategory={legacyActiveCategory}
                selectedNodeId={selectedNodeId}
                onToggleCategory={handleLegacyToggleCategory}
                onSelectNode={setSelectedNodeId}
              />
            )}
          </main>

          <MusicController tracks={MUSIC_TRACKS} />

          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              simpleView={visualization === "simple"}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
      </>
    </div>
  );
}

function resolveVisualization(search: string): DashboardVisualization {
  const requested = new URLSearchParams(search).get("view");

  if (
    requested &&
    DASHBOARD_VISUALIZATIONS.includes(requested as DashboardVisualization)
  ) {
    return requested as DashboardVisualization;
  }

  return "simple";
}

function DetailPanel({
  node,
  simpleView,
  onClose,
}: {
  node: ProjectNode;
  simpleView: boolean;
  onClose: () => void;
}) {
  const categoryStyle = CATEGORY_STYLES[node.category];
  const simpleCategoryStyle = SIMPLE_CATEGORY_STYLES[node.category];
  const status = STATUS_STYLES[node.status];

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <aside className="fixed inset-x-4 bottom-4 z-40 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-lg border border-white/15 bg-slate-950/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-xl sm:left-auto sm:right-6 sm:top-20 sm:w-[390px]">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-slate-300 transition hover:bg-white/10 hover:text-white"
        aria-label="Close detail panel"
      >
        <CloseIcon />
      </button>

      <div className="pr-10">
        <div className="flex items-center gap-4">
          <NodeIcon node={node} simpleView={simpleView} />
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${
                simpleView ? "" : categoryStyle.accentClass
              }`}
              style={simpleView ? { color: simpleCategoryStyle.color } : undefined}
            >
              {categoryStyle.title}
            </p>
            <h2 className="mt-1 text-xl font-bold text-white">{node.title}</h2>
          </div>
        </div>

        <p className="mt-5 text-sm leading-6 text-slate-300">
          {node.description}
        </p>
      </div>

      <div className="mt-5 flex items-center gap-2 border-y border-white/10 py-4 text-sm">
        <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
        <span className={status.textClass}>{status.label}</span>
      </div>

      <dl className="mt-4 space-y-3">
        {node.metrics.map((metric) => (
          <div key={metric.label} className="flex items-start justify-between gap-4">
            <dt className="text-sm text-slate-400">{metric.label}</dt>
            <dd
              className={`max-w-[58%] text-right text-sm font-medium ${metricToneClass(
                metric.tone
              )}`}
            >
              {metric.value}
            </dd>
          </div>
        ))}
      </dl>

      {node.error && (
        <div className="mt-5 rounded-lg border border-red-400/30 bg-red-500/10 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-200">
            Current error
          </p>
          <p className="mt-2 text-sm leading-6 text-red-100">{node.error}</p>
        </div>
      )}

      <a
        href={node.link}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(event) => event.stopPropagation()}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-white px-4 py-3 text-sm font-bold text-slate-950 transition hover:bg-blue-100"
      >
        Open link
        <ExternalIcon />
      </a>
    </aside>
  );
}

function NodeIcon({
  node,
  simpleView,
}: {
  node: ProjectNode;
  simpleView: boolean;
}) {
  const categoryStyle = CATEGORY_STYLES[node.category];

  if (simpleView) {
    const simpleCategoryStyle = SIMPLE_CATEGORY_STYLES[node.category];

    return (
      <span
        className="grid h-14 w-14 shrink-0 place-items-center border-2 text-base font-black"
        style={{
          borderColor: simpleCategoryStyle.color,
          color: simpleCategoryStyle.color,
        }}
        aria-hidden="true"
      >
        {node.icon}
      </span>
    );
  }

  return (
    <span
      className={`grid h-14 w-14 shrink-0 place-items-center rounded-full border-2 text-base font-black ${categoryStyle.borderClass} ${categoryStyle.surfaceClass} ${categoryStyle.accentClass} ${categoryStyle.glowClass}`}
      aria-hidden="true"
    >
      {node.icon}
    </span>
  );
}

function RefreshIcon({ spinning }: { spinning: boolean }) {
  return (
    <svg
      className={`h-4 w-4 ${spinning ? "animate-spin" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M4 4v6h6M20 20v-6h-6M5.3 15A7 7 0 0 0 17.7 18M18.7 9A7 7 0 0 0 6.3 6"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M6 6l12 12M18 6L6 18"
      />
    </svg>
  );
}

function ExternalIcon() {
  return (
    <svg
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M14 4h6v6M20 4l-9 9M20 14v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h4"
      />
    </svg>
  );
}
