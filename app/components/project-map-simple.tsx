"use client";

import {
  CATEGORY_ORDER,
  STATUS_STYLES,
  type CategoryId,
  type ProjectNode,
} from "@/lib/public-project-map";

type ProjectMapSimpleProps = {
  nodes: ProjectNode[];
  openCategories: ReadonlySet<CategoryId>;
  selectedNodeId: string | null;
  onToggleCategory: (category: CategoryId) => void;
  onSelectNode: (nodeId: string) => void;
};

export const SIMPLE_CATEGORY_STYLES: Record<
  CategoryId,
  { title: string; color: string; softColor: string }
> = {
  social: {
    title: "Social Media",
    color: "#ff8aad",
    softColor: "rgba(255, 138, 173, 0.16)",
  },
  websites: {
    title: "Websites",
    color: "#ffe34f",
    softColor: "rgba(255, 227, 79, 0.16)",
  },
  tools: {
    title: "Tools",
    color: "#55df79",
    softColor: "rgba(85, 223, 121, 0.16)",
  },
  extensions: {
    title: "Browser Extensions",
    color: "#78c5ff",
    softColor: "rgba(120, 197, 255, 0.16)",
  },
};

export function ProjectMapSimple({
  nodes,
  openCategories,
  selectedNodeId,
  onToggleCategory,
  onSelectNode,
}: ProjectMapSimpleProps) {
  return (
    <div className="h-full overflow-y-auto bg-[#9a6048] text-[#27150f]">
      <div className="pointer-events-none fixed inset-0 bg-[linear-gradient(115deg,rgba(255,229,188,0.08),transparent_42%),repeating-linear-gradient(0deg,rgba(54,27,18,0.035)_0,rgba(54,27,18,0.035)_1px,transparent_1px,transparent_6px)]" />

      <div className="relative mx-auto min-h-full w-full max-w-[1500px] px-5 pb-28 pt-20 sm:px-9 sm:pt-24 lg:px-14 lg:pb-32">
        {CATEGORY_ORDER.map((category) => {
          const style = SIMPLE_CATEGORY_STYLES[category];
          const categoryNodes = nodes.filter(
            (node) => node.category === category
          );
          const open = openCategories.has(category);
          const contentId = `simple-category-${category}`;

          return (
            <section
              key={category}
              className="border-b border-[#3f2118]/35 first:border-t"
            >
              <button
                type="button"
                onClick={() => onToggleCategory(category)}
                aria-expanded={open}
                aria-controls={contentId}
                className="group flex w-full items-center justify-between gap-5 py-6 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#28150f] focus-visible:ring-offset-4 focus-visible:ring-offset-[#9a6048] sm:py-8"
              >
                <span className="flex min-w-0 items-center gap-3 sm:gap-5">
                  <span
                    aria-hidden="true"
                    className="text-5xl font-light leading-none sm:text-7xl"
                    style={{ color: style.color }}
                  >
                    /
                  </span>
                  <span
                    className="min-w-0 text-4xl font-black leading-none sm:text-6xl"
                    style={{ color: style.color }}
                  >
                    {style.title}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-3 text-[#321b14] sm:gap-5">
                  <span className="hidden text-sm font-bold sm:inline">
                    {categoryNodes.length}{" "}
                    {categoryNodes.length === 1 ? "item" : "items"}
                  </span>
                  <ChevronIcon open={open} />
                </span>
              </button>

              <div
                id={contentId}
                aria-hidden={!open}
                className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out motion-reduce:transition-none ${
                  open
                    ? "grid-rows-[1fr] opacity-100"
                    : "grid-rows-[0fr] opacity-0"
                }`}
              >
                <div className="overflow-hidden">
                  <ul className="pb-7 sm:ml-[5.5rem] sm:pb-9">
                    {categoryNodes.map((node) => (
                      <ItemRow
                        key={node.id}
                        node={node}
                        open={open}
                        selected={selectedNodeId === node.id}
                        color={style.color}
                        softColor={style.softColor}
                        onSelectNode={onSelectNode}
                      />
                    ))}
                  </ul>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}

function ItemRow({
  node,
  open,
  selected,
  color,
  softColor,
  onSelectNode,
}: {
  node: ProjectNode;
  open: boolean;
  selected: boolean;
  color: string;
  softColor: string;
  onSelectNode: (nodeId: string) => void;
}) {
  const status = STATUS_STYLES[node.status];

  return (
    <li className="border-t border-[#3f2118]/25 first:border-t-0">
      <button
        type="button"
        tabIndex={open ? 0 : -1}
        onClick={() => onSelectNode(node.id)}
        aria-pressed={selected}
        className="group flex w-full items-center gap-4 px-2 py-4 text-left transition-colors hover:bg-[#5a3024]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#28150f] sm:gap-5 sm:px-4 sm:py-5"
        style={{ backgroundColor: selected ? softColor : undefined }}
      >
        <span
          aria-hidden="true"
          className="grid h-11 w-11 shrink-0 place-items-center border-2 text-sm font-black sm:h-12 sm:w-12"
          style={{ borderColor: color, color }}
        >
          {node.icon}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold leading-snug text-[#25130e] sm:text-xl">
            {node.title}
          </span>
          <span className="mt-1 flex items-center gap-2 text-sm font-semibold text-[#4d2a20] sm:hidden">
            <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
            {status.label}
          </span>
        </span>

        <span className="hidden shrink-0 items-center gap-2 text-sm font-bold text-[#3b2119] sm:flex">
          <span className={`h-2.5 w-2.5 rounded-full ${status.dotClass}`} />
          {status.label}
        </span>
      </button>
    </li>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-7 w-7 transition-transform duration-300 motion-reduce:transition-none sm:h-8 sm:w-8 ${
        open ? "rotate-180" : ""
      }`}
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        d="m6 9 6 6 6-6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
  );
}
