"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_ORDER,
  CATEGORY_STYLES,
  STATUS_STYLES,
  categoryHealth,
  type CategoryId,
  type ProjectNode,
} from "@/lib/public-project-map";

type ProjectMapPlayroomProps = {
  nodes: ProjectNode[];
  activeCategory: CategoryId | null;
  selectedNodeId: string | null;
  onToggleCategory: (category: CategoryId) => void;
  onSelectNode: (nodeId: string) => void;
};

type Point = {
  x: number;
  y: number;
};

const CATEGORY_POINTS: Record<CategoryId, { desktop: Point; mobile: Point }> = {
  social: {
    desktop: { x: 22, y: 34 },
    mobile: { x: 27, y: 34 },
  },
  websites: {
    desktop: { x: 74, y: 34 },
    mobile: { x: 73, y: 36 },
  },
  tools: {
    desktop: { x: 29, y: 72 },
    mobile: { x: 30, y: 63 },
  },
  extensions: {
    desktop: { x: 72, y: 72 },
    mobile: { x: 70, y: 65 },
  },
};

const HUB_POINT = {
  desktop: { x: 50, y: 54 },
  mobile: { x: 50, y: 50 },
};

export function ProjectMapPlayroom({
  nodes,
  activeCategory,
  selectedNodeId,
  onToggleCategory,
  onSelectNode,
}: ProjectMapPlayroomProps) {
  const [viewportWidth, setViewportWidth] = useState(0);

  useEffect(() => {
    const syncViewportWidth = () => setViewportWidth(window.innerWidth);
    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);

    return () => window.removeEventListener("resize", syncViewportWidth);
  }, []);

  const mobile = viewportWidth > 0 && viewportWidth < 768;
  const hubPoint = mobile ? HUB_POINT.mobile : HUB_POINT.desktop;
  const categoryCounts = useMemo(
    () =>
      CATEGORY_ORDER.reduce(
        (accumulator, category) => {
          accumulator[category] = nodes.filter(
            (node) => node.category === category
          ).length;
          return accumulator;
        },
        {} as Record<CategoryId, number>
      ),
    [nodes]
  );
  const activeNodes = useMemo(
    () =>
      activeCategory
        ? nodes.filter((node) => node.category === activeCategory)
        : [],
    [activeCategory, nodes]
  );
  const categoryPoints = useMemo(
    () =>
      CATEGORY_ORDER.reduce(
        (accumulator, category) => {
          accumulator[category] = categoryPoint(category, mobile, activeCategory);
          return accumulator;
        },
        {} as Record<CategoryId, Point>
      ),
    [activeCategory, mobile]
  );
  const itemPoints = useMemo(
    () =>
      activeNodes.reduce(
        (accumulator, node, index) => {
          accumulator[node.id] = itemPoint(
            activeCategory,
            categoryPoints,
            index,
            activeNodes.length,
            mobile
          );
          return accumulator;
        },
        {} as Record<string, Point>
      ),
    [activeCategory, activeNodes, categoryPoints, mobile]
  );

  return (
    <section className="relative h-screen w-screen overflow-hidden bg-[#8cc8ff] text-slate-950">
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0)_44%),radial-gradient(circle_at_20%_18%,rgba(255,255,255,0.55),transparent_18%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.42),transparent_18%)]" />
      <div className="absolute inset-x-0 top-[76px] h-20 border-y-4 border-white/70 bg-[#f7e27a] shadow-[0_10px_24px_rgba(44,76,118,0.16)] sm:top-[64px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_12px_18px,#ffef99_0_9px,transparent_10px),radial-gradient(circle_at_54px_48px,#ffd166_0_8px,transparent_9px),linear-gradient(135deg,rgba(49,130,206,0.2)_25%,transparent_25%_50%,rgba(49,130,206,0.2)_50%_75%,transparent_75%)] bg-[length:86px_64px]" />
        {Array.from({ length: 9 }).map((_, index) => (
          <span
            key={index}
            className="playroom-cloud absolute top-5 h-8 w-16"
            style={{ left: `${index * 13 - 5}%` }}
            aria-hidden="true"
          />
        ))}
      </div>
      <div className="absolute inset-x-0 bottom-0 h-[26vh] bg-[linear-gradient(90deg,#d08a43,#f0b669_16%,#bf7535_34%,#f3c37a_52%,#b86a2e_74%,#e8aa5e)] opacity-95 shadow-[0_-18px_34px_rgba(69,43,18,0.24)]">
        <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,rgba(88,52,22,0.22)_0_2px,transparent_2px_18%),linear-gradient(180deg,rgba(255,255,255,0.18),transparent)]" />
      </div>
      <div className="absolute bottom-[24vh] left-0 right-0 h-5 bg-[#5f7fb2] shadow-[0_-2px_0_rgba(255,255,255,0.36)_inset]" />

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        {CATEGORY_ORDER.map((category) => {
          const style = CATEGORY_STYLES[category];
          const point = categoryPoints[category];
          const muted = activeCategory !== null && activeCategory !== category;

          return (
            <line
              key={`category-line-${category}`}
              x1={hubPoint.x}
              y1={hubPoint.y}
              x2={point.x}
              y2={point.y}
              stroke={style.colorHex}
              strokeLinecap="round"
              strokeWidth={muted ? 0.22 : 0.44}
              opacity={muted ? 0.16 : 0.58}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
        {activeCategory &&
          activeNodes.map((node) => {
            const style = CATEGORY_STYLES[node.category];
            const from = categoryPoints[node.category];
            const to = itemPoints[node.id];

            return (
              <line
                key={`item-line-${node.id}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={style.colorHex}
                strokeLinecap="round"
                strokeWidth={0.42}
                opacity={0.5}
                vectorEffect="non-scaling-stroke"
              />
            );
          })}
      </svg>

      <div
        className="playroom-ball absolute grid h-28 w-28 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-[6px] border-white/70 text-3xl font-black text-white shadow-[0_20px_30px_rgba(26,54,93,0.24)] sm:h-36 sm:w-36 sm:text-4xl"
        style={{
          left: `${hubPoint.x}%`,
          top: `${hubPoint.y}%`,
          background:
            "radial-gradient(circle at 32% 28%, #ffffff 0 8%, #ff5aa5 9% 27%, #ffe066 28% 46%, #4dabf7 47% 67%, #845ef7 68% 100%)",
        }}
        aria-hidden="true"
      >
        0x
      </div>

      {CATEGORY_ORDER.map((category) => {
        const style = CATEGORY_STYLES[category];
        const categoryNodes = nodes.filter((node) => node.category === category);
        const health = categoryHealth(categoryNodes);
        const status = STATUS_STYLES[health];
        const point = categoryPoints[category];
        const active = activeCategory === category;
        const muted = activeCategory !== null && !active;
        const hideInactiveMobileCategory = mobile && activeCategory && !active;

        if (hideInactiveMobileCategory) {
          return null;
        }

        return (
          <button
            key={category}
            type="button"
            onClick={() => onToggleCategory(category)}
            aria-expanded={active}
            className={`playroom-ball absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[5px] border-white/75 text-white shadow-[0_20px_32px_rgba(26,54,93,0.24)] transition duration-500 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-white/80 ${
              active
                ? "h-28 w-28 sm:h-40 sm:w-40"
                : "h-20 w-20 sm:h-32 sm:w-32"
            } ${muted ? "opacity-50" : "opacity-100"}`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              background: ballBackground(style.colorHex),
            }}
          >
            <span className="grid h-full w-full place-items-center rounded-full px-3 text-center">
              <span className="text-[10px] font-black uppercase tracking-normal drop-shadow sm:text-xs">
                {style.title}
              </span>
            </span>
            <span className="absolute left-1/2 top-[82%] min-w-[118px] -translate-x-1/2 rounded-lg border border-white/70 bg-white/88 px-3 py-2 text-center text-[11px] font-bold text-slate-800 shadow-lg backdrop-blur sm:min-w-[140px] sm:text-xs">
              {categoryCounts[category]}{" "}
              {categoryCounts[category] === 1 ? "item" : "items"}
              <span
                className="mx-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle"
                style={{ background: statusColor(status.color) }}
              />
              <span className={status.textClass}>{status.label}</span>
            </span>
          </button>
        );
      })}

      {activeNodes.map((node, index) => {
        const style = CATEGORY_STYLES[node.category];
        const status = STATUS_STYLES[node.status];
        const point = itemPoints[node.id];
        const selected = selectedNodeId === node.id;
        const dense = activeNodes.length > 6;

        return (
          <button
            key={node.id}
            type="button"
            onClick={() => onSelectNode(node.id)}
            aria-label={node.title}
            aria-pressed={selected}
            className={`playroom-ball absolute -translate-x-1/2 -translate-y-1/2 rounded-full border-[4px] border-white/80 text-white shadow-[0_16px_24px_rgba(26,54,93,0.24)] transition duration-500 hover:scale-110 focus:outline-none focus:ring-4 focus:ring-white/80 ${
              selected
                ? "h-20 w-20 sm:h-28 sm:w-28"
                : "h-14 w-14 sm:h-24 sm:w-24"
            }`}
            style={{
              left: `${point.x}%`,
              top: `${point.y}%`,
              background: ballBackground(style.colorHex),
              transitionDelay: `${Math.min(index * 35, 280)}ms`,
            }}
          >
            <span className="text-xs font-black drop-shadow sm:text-sm">
              {node.icon}
            </span>
            {!(mobile && dense) && (
              <span
                className={`absolute left-1/2 top-[78%] -translate-x-1/2 rounded-lg border border-slate-950/10 bg-white/90 px-2 py-1 text-center font-bold text-slate-900 shadow-lg backdrop-blur ${
                  dense
                    ? "max-w-[128px] text-[10px] leading-3 sm:max-w-[150px] sm:text-[11px]"
                    : "max-w-[160px] text-[11px] leading-4 sm:max-w-[190px] sm:text-xs"
                }`}
              >
                <span className="line-clamp-2">{node.title}</span>
                <span
                  className="mt-1 inline-block h-1.5 w-1.5 rounded-full"
                  style={{ background: statusColor(status.color) }}
                />
              </span>
            )}
          </button>
        );
      })}

      <style jsx>{`
        .playroom-ball {
          animation: playroom-bob 4.4s ease-in-out infinite;
          transform-origin: center;
        }

        .playroom-ball:nth-of-type(2n) {
          animation-delay: -1.2s;
        }

        .playroom-cloud {
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
          box-shadow: 22px 4px 0 rgba(255, 255, 255, 0.9),
            43px 0 0 rgba(255, 255, 255, 0.9);
        }

        .playroom-cloud::before,
        .playroom-cloud::after {
          position: absolute;
          content: "";
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.9);
        }

        .playroom-cloud::before {
          left: 12px;
          top: -10px;
          width: 30px;
          height: 30px;
        }

        .playroom-cloud::after {
          left: 36px;
          top: -6px;
          width: 24px;
          height: 24px;
        }

        @keyframes playroom-bob {
          0%,
          100% {
            translate: 0 0;
          }

          50% {
            translate: 0 -7px;
          }
        }
      `}</style>
    </section>
  );
}

function categoryPoint(
  category: CategoryId,
  mobile: boolean,
  activeCategory: CategoryId | null
) {
  if (mobile && activeCategory === category) {
    return { x: 50, y: 72 };
  }

  return mobile
    ? CATEGORY_POINTS[category].mobile
    : CATEGORY_POINTS[category].desktop;
}

function itemPoint(
  category: CategoryId | null,
  categoryPoints: Record<CategoryId, Point>,
  index: number,
  total: number,
  mobile: boolean
): Point {
  if (!category) {
    return { x: 50, y: 50 };
  }

  if (mobile && total > 4) {
    const columns = total > 6 ? 3 : 2;
    const row = Math.floor(index / columns);
    const column = index % columns;
    const startX = 50 - ((columns - 1) * 27) / 2;

    return {
      x: startX + column * 27,
      y: 34 + row * 12,
    };
  }

  const center = categoryPoints[category];
  const angleOffset: Record<CategoryId, number> = {
    social: -1.2,
    websites: -0.05,
    tools: 2.25,
    extensions: 0.75,
  };
  const angle =
    angleOffset[category] + (Math.PI * 2 * index) / Math.max(total, 1);
  const radiusX = mobile ? 27 : total > 5 ? 20 : 16;
  const radiusY = mobile ? 18 : total > 5 ? 18 : 14;

  return {
    x: clamp(center.x + Math.cos(angle) * radiusX, mobile ? 11 : 7, mobile ? 89 : 93),
    y: clamp(center.y + Math.sin(angle) * radiusY, mobile ? 24 : 14, mobile ? 78 : 86),
  };
}

function ballBackground(color: string) {
  const dark = darkenHex(color, 34);

  return `radial-gradient(circle at 30% 24%, rgba(255,255,255,0.98) 0 8%, ${color} 9% 45%, ${dark} 82% 100%)`;
}

function darkenHex(hex: string, amount: number) {
  const value = hex.replace("#", "");
  const red = Math.max(0, Number.parseInt(value.slice(0, 2), 16) - amount);
  const green = Math.max(0, Number.parseInt(value.slice(2, 4), 16) - amount);
  const blue = Math.max(0, Number.parseInt(value.slice(4, 6), 16) - amount);

  return `#${[red, green, blue]
    .map((channel) => channel.toString(16).padStart(2, "0"))
    .join("")}`;
}

function statusColor(color: number) {
  return `#${color.toString(16).padStart(6, "0")}`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
