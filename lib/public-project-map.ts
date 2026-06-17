import { filterChromeExtensions } from "@/lib/public-exclusions";
import type { TestResult } from "@/lib/scraper";

export type PublicResults = Pick<
  TestResult["results"],
  | "youtube"
  | "twitter"
  | "instagram"
  | "github"
  | "extensions"
  | "websites"
  | "chromeExtensions"
  | "bethecandle"
>;

export type DashboardResponse = {
  timestamp?: string | null;
  results?: (Partial<PublicResults> & {
    crypto?: TestResult["results"]["crypto"];
  }) | null;
  message?: string;
  error?: string;
};

export type PublicDashboardData = {
  timestamp: string;
  results: PublicResults;
};

export type CategoryId = "social" | "websites" | "tools" | "extensions";
export type DataState = "loading" | "ready" | "error";
export type NodeStatus = "loading" | "operational" | "error" | "unavailable";
export type MetricTone = "default" | "positive" | "muted" | "warning";
export type ScenePosition = [number, number, number];

export type ProjectNode = {
  id: string;
  category: CategoryId;
  title: string;
  icon: string;
  status: NodeStatus;
  metrics: Array<{ label: string; value: string; tone?: MetricTone }>;
  description: string;
  link: string;
  error?: string;
  scenePosition: ScenePosition;
  mobileOrder: number;
};

export const HUB_ID = "hub";
export const HUB_POSITION: ScenePosition = [0, 0, 0];
export const CATEGORY_ORDER = [
  "social",
  "websites",
  "tools",
  "extensions",
] as const;

export const CATEGORY_STYLES: Record<
  CategoryId,
  {
    title: string;
    summary: string;
    abbr: string;
    accentClass: string;
    borderClass: string;
    surfaceClass: string;
    glowClass: string;
    color: number;
    colorHex: string;
  }
> = {
  social: {
    title: "Social Media",
    summary: "Content, community and connection.",
    abbr: "SM",
    accentClass: "text-pink-300",
    borderClass: "border-pink-400/80",
    surfaceClass: "bg-pink-500/15",
    glowClass: "shadow-[0_0_30px_rgba(236,72,153,0.38)]",
    color: 0xec4899,
    colorHex: "#ec4899",
  },
  websites: {
    title: "Websites",
    summary: "Public web projects and communities.",
    abbr: "WEB",
    accentClass: "text-blue-300",
    borderClass: "border-blue-400/80",
    surfaceClass: "bg-blue-500/15",
    glowClass: "shadow-[0_0_30px_rgba(59,130,246,0.38)]",
    color: 0x3b82f6,
    colorHex: "#3b82f6",
  },
  tools: {
    title: "Tools",
    summary: "Utilities, experiments and automation.",
    abbr: "TL",
    accentClass: "text-lime-300",
    borderClass: "border-lime-400/80",
    surfaceClass: "bg-lime-500/15",
    glowClass: "shadow-[0_0_30px_rgba(132,204,22,0.34)]",
    color: 0x84cc16,
    colorHex: "#84cc16",
  },
  extensions: {
    title: "Browser Extensions",
    summary: "Published browser tools and store signals.",
    abbr: "EXT",
    accentClass: "text-amber-300",
    borderClass: "border-amber-300/80",
    surfaceClass: "bg-amber-500/15",
    glowClass: "shadow-[0_0_30px_rgba(245,158,11,0.34)]",
    color: 0xf59e0b,
    colorHex: "#f59e0b",
  },
};

export const CATEGORY_SCENE_POSITIONS: Record<CategoryId, ScenePosition> = {
  social: [-3.9, 1.45, 0.35],
  websites: [3.75, 1.35, 0.05],
  tools: [-3.05, -2.45, 0.5],
  extensions: [3.35, -2.55, 0.4],
};

export const CATEGORY_NODE_IDS: Record<CategoryId, `category-${CategoryId}`> = {
  social: "category-social",
  websites: "category-websites",
  tools: "category-tools",
  extensions: "category-extensions",
};

export const CATEGORY_CONNECTORS = CATEGORY_ORDER.map((category) => ({
  from: HUB_ID,
  to: CATEGORY_NODE_IDS[category],
  category,
}));

export const STATUS_STYLES: Record<
  NodeStatus,
  { label: string; dotClass: string; textClass: string; color: number }
> = {
  loading: {
    label: "Loading",
    dotClass: "bg-slate-300",
    textClass: "text-slate-300",
    color: 0xcbd5e1,
  },
  operational: {
    label: "Operational",
    dotClass: "bg-emerald-400",
    textClass: "text-emerald-300",
    color: 0x34d399,
  },
  error: {
    label: "Error",
    dotClass: "bg-red-400",
    textClass: "text-red-300",
    color: 0xf87171,
  },
  unavailable: {
    label: "No data",
    dotClass: "bg-amber-300",
    textClass: "text-amber-200",
    color: 0xfcd34d,
  },
};

export function buildProjectNodes(
  results: PublicResults | null,
  dataState: DataState
): ProjectNode[] {
  const baseMetric =
    dataState === "loading"
      ? { label: "Data", value: "Loading data", tone: "muted" as const }
      : { label: "Data", value: "Unavailable", tone: "warning" as const };
  const socialNodes = buildSocialNodes(results, dataState, baseMetric);
  const websiteNodes = buildWebsiteNodes(results, dataState, baseMetric);
  const toolNodes = buildToolNodes(results, dataState, baseMetric);
  const extensionNodes = buildExtensionNodes(results, dataState, baseMetric);

  return [...socialNodes, ...websiteNodes, ...toolNodes, ...extensionNodes];
}

export function buildItemConnectors(nodes: ProjectNode[]) {
  return nodes.map((node) => ({
    from: CATEGORY_NODE_IDS[node.category],
    to: node.id,
    category: node.category,
  }));
}

export function categoryHealth(nodes: ProjectNode[]): NodeStatus {
  if (nodes.length === 0) {
    return "unavailable";
  }

  if (nodes.some((node) => node.status === "loading")) {
    return "loading";
  }

  if (nodes.some((node) => node.status === "error")) {
    return "error";
  }

  if (nodes.some((node) => node.status === "unavailable")) {
    return "unavailable";
  }

  return "operational";
}

export function toPublicDashboardData(
  payload: DashboardResponse
): PublicDashboardData | null {
  if (
    !payload.timestamp ||
    !payload.results?.youtube ||
    !payload.results.twitter ||
    !payload.results.instagram ||
    !payload.results.github
  ) {
    return null;
  }

  const chromeExtensions = filterChromeExtensions(
    payload.results.chromeExtensions ?? []
  );
  const legacyExtensions = filterChromeExtensions(
    payload.results.extensions ?? []
  );

  return {
    timestamp: payload.timestamp,
    results: {
      youtube: payload.results.youtube,
      twitter: payload.results.twitter,
      instagram: payload.results.instagram,
      github: payload.results.github,
      extensions: legacyExtensions,
      websites: payload.results.websites ?? [],
      chromeExtensions,
      bethecandle: payload.results.bethecandle,
    },
  };
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function metricToneClass(tone: MetricTone = "default") {
  if (tone === "positive") {
    return "text-emerald-200";
  }

  if (tone === "warning") {
    return "text-amber-200";
  }

  if (tone === "muted") {
    return "text-slate-300";
  }

  return "text-white";
}

function buildSocialNodes(
  results: PublicResults | null,
  dataState: DataState,
  baseMetric: ProjectNode["metrics"][number]
): ProjectNode[] {
  const nodes: Array<Omit<ProjectNode, "scenePosition" | "mobileOrder">> = [
    {
      id: "youtube",
      category: "social",
      title: "YouTube",
      icon: "YT",
      status: statusFromResult(results?.youtube, dataState),
      metrics: results
        ? [{ label: "Last video", value: results.youtube.lastVideo || "N/A" }]
        : [baseMetric],
      description:
        "Main channel where I share content about tech, development and digital projects.",
      link: "https://www.youtube.com/@jmtdev",
      error: results?.youtube.error,
    },
    {
      id: "twitter",
      category: "social",
      title: "X / Twitter",
      icon: "X",
      status: statusFromResult(results?.twitter, dataState),
      metrics: results
        ? [
            { label: "Last tweet", value: results.twitter.lastTweet || "N/A" },
            {
              label: "Total tweets",
              value: results.twitter.totalTweets || "N/A",
            },
          ]
        : [baseMetric],
      description:
        "Automation and short-form updates from the Windy Bot account.",
      link: "https://x.com/windyBotES",
      error: results?.twitter.error,
    },
    {
      id: "instagram",
      category: "social",
      title: "Instagram",
      icon: "IG",
      status: statusFromResult(results?.instagram, dataState),
      metrics: results
        ? [{ label: "Last post", value: results.instagram.lastPost || "N/A" }]
        : [baseMetric],
      description: "Visual project archive for the An Animal A Day account.",
      link: "https://www.instagram.com/anainimaladay/",
      error: results?.instagram.error,
    },
  ];

  return withClusterPositions(nodes, 1);
}

function buildWebsiteNodes(
  results: PublicResults | null,
  dataState: DataState,
  baseMetric: ProjectNode["metrics"][number]
): ProjectNode[] {
  const websites = results?.websites?.length
    ? results.websites
    : results?.bethecandle
      ? [
          {
            name: "Be The Candle",
            repo: "BeTheCandle",
            repoUrl: "https://github.com/jmtdev0/BeTheCandle",
            url: "https://bethecandle.live/",
            success: results.bethecandle.success,
            source: "custom-domain" as const,
            description: "Community pot history and distributed USDC total.",
          },
        ]
      : [];

  const nodes = websites.map((site) => {
    const isBeTheCandle =
      site.repo.toLowerCase() === "bethecandle" ||
      site.url.includes("bethecandle.live");
    const metrics: ProjectNode["metrics"] = results
      ? [
          { label: "URL", value: hostFromUrl(site.url) },
          {
            label: "Status",
            value: site.statusCode ? `${site.statusCode}` : "N/A",
            tone: site.success ? "positive" : "warning",
          },
          {
            label: "Response time",
            value:
              site.responseTimeMs != null ? `${site.responseTimeMs} ms` : "N/A",
          },
          {
            label: "Source",
            value: site.source === "netlify" ? "Netlify" : "Custom domain",
            tone: "muted",
          },
        ]
      : [baseMetric];

    if (results && isBeTheCandle) {
      metrics.push({
        label: "Total distributed",
        value:
          results.bethecandle?.totalDistributed != null
            ? `$${results.bethecandle.totalDistributed.toFixed(2)} USDC`
            : "N/A",
        tone: "positive",
      });
    }

    if (results && site.lastPushedAt) {
      metrics.push({
        label: "Last pushed",
        value: formatDate(site.lastPushedAt),
        tone: "muted",
      });
    }

    return {
      id: `website-${slugFromValue(site.repo || site.name || site.url)}`,
      category: "websites" as const,
      title: site.name,
      icon: abbreviateTitle(site.name),
      status: statusFromResult(site, dataState),
      metrics,
      description:
        site.description ||
        "Public web project discovered from GitHub metadata.",
      link: site.url,
      error:
        site.error ||
        (isBeTheCandle ? results?.bethecandle?.error : undefined),
    };
  });

  return withClusterPositions(nodes, 10);
}

function buildToolNodes(
  results: PublicResults | null,
  dataState: DataState,
  baseMetric: ProjectNode["metrics"][number]
): ProjectNode[] {
  const nodes: Array<Omit<ProjectNode, "scenePosition" | "mobileOrder">> = [
    {
      id: "kingdom-hearts",
      category: "tools",
      title: "Kingdom Hearts Custom Music",
      icon: "KH",
      status: statusFromResult(results?.github, dataState),
      metrics: results
        ? [
            { label: "Latest version", value: results.github.version || "N/A" },
            {
              label: "Release date",
              value: results.github.releaseDate
                ? formatDate(results.github.releaseDate)
                : "N/A",
            },
            {
              label: "Downloads",
              value:
                results.github.downloads != null
                  ? results.github.downloads.toLocaleString("en-US")
                  : "N/A",
            },
          ]
        : [baseMetric],
      description: "GitHub release monitor for the custom music tool.",
      link: "https://github.com/jmtdev0/KingdomHeartsCustomMusic",
      error: results?.github.error,
    },
  ];

  return withClusterPositions(nodes, 30);
}

function buildExtensionNodes(
  results: PublicResults | null,
  dataState: DataState,
  baseMetric: ProjectNode["metrics"][number]
): ProjectNode[] {
  const extensions: Array<{
    name: string;
    extensionId: string;
    storeUrl: string;
    success: boolean;
    available?: boolean;
    repo?: string;
    users?: string;
    rating?: string;
    ratingCount?: string;
    metricsError?: string;
    error?: string;
  }> = results?.chromeExtensions?.length
    ? results.chromeExtensions
    : (results?.extensions ?? []).map((extension) => ({
        name: extension.name,
        extensionId: extension.extensionId,
        storeUrl: `https://chromewebstore.google.com/detail/${extension.extensionId}`,
        success: extension.success,
        available: extension.available,
        error: extension.error,
      }));

  const nodes: Array<Omit<ProjectNode, "scenePosition" | "mobileOrder">> =
    extensions.map((extension) => {
      const metrics: ProjectNode["metrics"] = results
        ? [
            {
              label: "Available",
              value: extension.available ? "Yes" : "No",
              tone: extension.available ? "positive" : "warning",
            },
            {
              label: "Users",
              value: extension.users || "Unavailable",
              tone: extension.users ? "default" : "muted",
            },
            {
              label: "Rating",
              value: extension.rating
                ? `${extension.rating}${extension.ratingCount ? ` (${extension.ratingCount})` : ""}`
                : "Unavailable",
              tone: extension.rating ? "positive" : "muted",
            },
            {
              label: "Source",
              value: extension.repo || "Known ID",
              tone: "muted",
            },
          ]
        : [baseMetric];

      return {
        id: `extension-${slugFromValue(extension.extensionId)}`,
        category: "extensions",
        title: extension.name,
        icon: abbreviateTitle(extension.name),
        status: statusFromResult(extension, dataState),
        metrics,
        description: "Published Chrome extension and store availability monitor.",
        link: extension.storeUrl,
        error: extension.error || extension.metricsError,
      };
    });

  return withClusterPositions(nodes, 40);
}

function withClusterPositions(
  nodes: Array<Omit<ProjectNode, "scenePosition" | "mobileOrder">>,
  orderOffset: number
): ProjectNode[] {
  return nodes.map((node, index) => ({
    ...node,
    scenePosition: clusterPosition(node.category, index, nodes.length),
    mobileOrder: orderOffset + index,
  }));
}

function clusterPosition(
  category: CategoryId,
  index: number,
  total: number
): ScenePosition {
  const center = CATEGORY_SCENE_POSITIONS[category];
  const itemsPerRing =
    category === "extensions" ? 5 : category === "websites" ? 4 : 6;
  const ring = Math.floor(index / itemsPerRing);
  const indexInRing = index % itemsPerRing;
  const itemsInRing = Math.min(itemsPerRing, total - ring * itemsPerRing);
  const angleOffset: Record<CategoryId, number> = {
    social: -0.25,
    websites: 0.55,
    tools: -1.3,
    extensions: 1.1,
  };
  const radiusX =
    category === "extensions"
      ? 1.95 + ring * 1.2
      : category === "websites"
        ? 1.65 + ring * 1.05
        : 1.35 + ring * 0.9;
  const radiusY =
    category === "extensions"
      ? 1.45 + ring * 0.82
      : category === "websites"
        ? 1.18 + ring * 0.72
        : 1.05 + ring * 0.58;
  const angle =
    angleOffset[category] +
    (Math.PI * 2 * indexInRing) / Math.max(itemsInRing, 1) +
    ring * 0.42;

  return [
    center[0] + Math.cos(angle) * radiusX,
    center[1] + Math.sin(angle) * radiusY,
    center[2] +
      (index % 2 === 0 ? 0.38 : -0.22) +
      ring * (category === "extensions" ? 0.36 : 0.28),
  ];
}

function statusFromResult(
  result: { success?: boolean } | undefined,
  dataState: DataState
): NodeStatus {
  if (dataState === "loading") {
    return "loading";
  }

  if (dataState === "error") {
    return "unavailable";
  }

  return result?.success ? "operational" : "error";
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    dateStyle: "medium",
  });
}

function hostFromUrl(value: string) {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return value;
  }
}

function abbreviateTitle(value: string) {
  const words = value.replace(/[/_-]+/g, " ").match(/[A-Za-z0-9]+/g) ?? [];

  if (words.length === 0) {
    return "0X";
  }

  if (words.length === 1) {
    return words[0].slice(0, 3).toUpperCase();
  }

  return words
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function slugFromValue(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}
