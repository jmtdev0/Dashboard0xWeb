"use client";

import { useEffect, useMemo, useState } from "react";
import { MusicController } from "@/app/components/music-controller";
import { ProjectMap3D } from "@/app/components/project-map-3d";
import { ProjectMapPlayroom } from "@/app/components/project-map-playroom";
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

const DASHBOARD_VISUALIZATIONS = ["crystarium", "playroom"] as const;

type DashboardVisualization = (typeof DASHBOARD_VISUALIZATIONS)[number];

export default function Dashboard() {
  const [data, setData] = useState<PublicDashboardData | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<CategoryId | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [visualization, setVisualization] =
    useState<DashboardVisualization | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const selected = selectInitialVisualization();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const timer = window.setTimeout(
      () => setVisualization(selected),
      reducedMotion ? 250 : 950
    );

    return () => window.clearTimeout(timer);
  }, []);

  const dataState: DataState = data ? "ready" : error ? "error" : "loading";
  const nodes = useMemo(
    () => buildProjectNodes(data?.results ?? null, dataState),
    [data?.results, dataState]
  );
  const selectedNode =
    nodes.find((node) => node.id === selectedNodeId) ?? null;

  const handleToggleCategory = (category: CategoryId) => {
    setActiveCategory((current) => (current === category ? null : category));
    setSelectedNodeId(null);
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
    <div className="relative min-h-screen overflow-hidden bg-[#020617] text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(168,85,247,0.24),transparent_34%),radial-gradient(circle_at_17%_24%,rgba(236,72,153,0.16),transparent_28%),radial-gradient(circle_at_82%_24%,rgba(59,130,246,0.18),transparent_30%)]" />

      {!visualization && <VisualizationLoadingScreen />}

      {error && (
        <div
          role="alert"
          className="pointer-events-auto fixed left-4 right-20 top-5 z-30 rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100 backdrop-blur-md sm:left-6 sm:max-w-xl lg:left-8"
        >
          {error}
        </div>
      )}

      {visualization && (
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
            className="fixed right-4 top-5 z-40 grid h-12 w-12 place-items-center rounded-lg border border-blue-300/30 bg-blue-500/15 text-blue-100 shadow-[0_0_24px_rgba(59,130,246,0.18)] transition hover:border-blue-300/60 hover:bg-blue-500/25 disabled:cursor-not-allowed disabled:opacity-60 sm:right-6 lg:right-8"
          >
            <RefreshIcon spinning={refreshing || initialLoading} />
          </button>

          <main className="fixed inset-0 z-10">
            {visualization === "crystarium" ? (
              <ProjectMap3D
                nodes={nodes}
                activeCategory={activeCategory}
                selectedNodeId={selectedNodeId}
                onToggleCategory={handleToggleCategory}
                onSelectNode={setSelectedNodeId}
              />
            ) : (
              <ProjectMapPlayroom
                nodes={nodes}
                activeCategory={activeCategory}
                selectedNodeId={selectedNodeId}
                onToggleCategory={handleToggleCategory}
                onSelectNode={setSelectedNodeId}
              />
            )}
          </main>

          <MusicController tracks={MUSIC_TRACKS} />

          {selectedNode && (
            <DetailPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </>
      )}
    </div>
  );
}

function selectInitialVisualization(): DashboardVisualization {
  const requested = new URLSearchParams(window.location.search).get("view");

  if (
    requested &&
    DASHBOARD_VISUALIZATIONS.includes(requested as DashboardVisualization)
  ) {
    return requested as DashboardVisualization;
  }

  return DASHBOARD_VISUALIZATIONS[
    Math.floor(Math.random() * DASHBOARD_VISUALIZATIONS.length)
  ];
}

function VisualizationLoadingScreen() {
  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-[#07111f] text-white"
      aria-busy="true"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(96,165,250,0.22),transparent_32%),radial-gradient(circle_at_34%_70%,rgba(236,72,153,0.16),transparent_28%)]" />
      <div className="relative flex flex-col items-center gap-5 text-center">
        <div className="relative h-28 w-28">
          <span className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-white/70 bg-[radial-gradient(circle_at_32%_26%,#fff_0_10%,#60a5fa_11%_42%,#a855f7_72%)] shadow-[0_18px_34px_rgba(37,99,235,0.32)]" />
          <span className="absolute left-1 top-4 h-9 w-9 rounded-full border-2 border-white/70 bg-[radial-gradient(circle_at_32%_26%,#fff_0_12%,#ec4899_13%_100%)] animate-bounce" />
          <span className="absolute bottom-2 right-0 h-10 w-10 rounded-full border-2 border-white/70 bg-[radial-gradient(circle_at_32%_26%,#fff_0_12%,#f59e0b_13%_100%)] animate-pulse" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-blue-200">
            Choosing a view
          </p>
          <p className="mt-2 text-lg font-bold text-white">
            Rolling the dashboard into place
          </p>
        </div>
      </div>
    </div>
  );
}

function DetailPanel({
  node,
  onClose,
}: {
  node: ProjectNode;
  onClose: () => void;
}) {
  const categoryStyle = CATEGORY_STYLES[node.category];
  const status = STATUS_STYLES[node.status];

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
          <NodeIcon node={node} />
          <div>
            <p
              className={`text-xs font-bold uppercase tracking-[0.18em] ${categoryStyle.accentClass}`}
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

function NodeIcon({ node }: { node: ProjectNode }) {
  const categoryStyle = CATEGORY_STYLES[node.category];

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
