"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import {
  CATEGORY_CONNECTORS,
  CATEGORY_NODE_IDS,
  CATEGORY_ORDER,
  CATEGORY_SCENE_POSITIONS,
  CATEGORY_STYLES,
  HUB_ID,
  HUB_POSITION,
  STATUS_STYLES,
  buildItemConnectors,
  categoryHealth,
  type CategoryId,
  type NodeStatus,
  type ProjectNode,
  type ScenePosition,
} from "@/lib/public-project-map";

type SceneNodeKind = "hub" | "category" | "item";

type SceneNode = {
  id: string;
  kind: SceneNodeKind;
  category?: CategoryId;
  title: string;
  icon: string;
  status: NodeStatus;
  position: ScenePosition;
  color: number;
  colorHex: string;
  radius: number;
  order: number;
};

type ProjectMap3DProps = {
  nodes: ProjectNode[];
  activeCategory: CategoryId | null;
  selectedNodeId: string | null;
  onToggleCategory: (category: CategoryId) => void;
  onSelectNode: (nodeId: string) => void;
};

type LabelElement = HTMLButtonElement | HTMLDivElement;

type ConnectorMaterialSet = {
  category: CategoryId;
  from: string;
  core: THREE.MeshBasicMaterial;
  glow: THREE.MeshBasicMaterial;
  pulse: THREE.MeshBasicMaterial;
};

const SCRATCH_VECTOR = new THREE.Vector3();

export function ProjectMap3D({
  nodes,
  activeCategory,
  selectedNodeId,
  onToggleCategory,
  onSelectNode,
}: ProjectMap3DProps) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const labelRefs = useRef(new Map<string, LabelElement>());
  const [viewportWidth, setViewportWidth] = useState(0);
  const latestState = useRef({
    activeCategory,
    selectedNodeId,
    onToggleCategory,
    onSelectNode,
  });

  const categoryNodes = useMemo(
    () =>
      CATEGORY_ORDER.map((category) => {
        const style = CATEGORY_STYLES[category];
        const categoryItems = nodes.filter((node) => node.category === category);

        return {
          id: CATEGORY_NODE_IDS[category],
          kind: "category" as const,
          category,
          title: style.title,
          icon: style.abbr,
          status: categoryHealth(categoryItems),
          position: CATEGORY_SCENE_POSITIONS[category],
          color: style.color,
          colorHex: style.colorHex,
          radius: 0.52,
          order: 0,
        };
      }),
    [nodes]
  );

  const sceneNodes = useMemo<SceneNode[]>(() => {
    const itemNodes: SceneNode[] = nodes.map((node) => {
      const style = CATEGORY_STYLES[node.category];

      return {
        id: node.id,
        kind: "item",
        category: node.category,
        title: node.title,
        icon: node.icon,
        status: node.status,
        position: node.scenePosition,
        color: style.color,
        colorHex: style.colorHex,
        radius: 0.48,
        order: node.mobileOrder,
      };
    });

    return [
      {
        id: HUB_ID,
        kind: "hub",
        title: "0x",
        icon: "0x",
        status: "operational",
        position: HUB_POSITION,
        color: 0xa855f7,
        colorHex: "#a855f7",
        radius: 0.72,
        order: 0,
      },
      ...categoryNodes,
      ...itemNodes,
    ];
  }, [categoryNodes, nodes]);

  const itemConnectors = useMemo(() => buildItemConnectors(nodes), [nodes]);
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

  useEffect(() => {
    latestState.current = {
      activeCategory,
      selectedNodeId,
      onToggleCategory,
      onSelectNode,
    };
  }, [activeCategory, selectedNodeId, onToggleCategory, onSelectNode]);

  useEffect(() => {
    const syncViewportWidth = () => setViewportWidth(window.innerWidth);
    syncViewportWidth();
    window.addEventListener("resize", syncViewportWidth);

    return () => window.removeEventListener("resize", syncViewportWidth);
  }, []);

  useEffect(() => {
    const mount = mountRef.current;

    if (!mount) {
      return;
    }

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x020617, 0.055);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.set(0, 2.8, 10);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setClearColor(0x020617, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.domElement.className = "absolute inset-0 h-full w-full";
    mount.appendChild(renderer.domElement);

    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      0.48,
      0.48,
      0.16
    );
    composer.addPass(renderPass);
    composer.addPass(bloomPass);

    const root = new THREE.Group();
    root.rotation.x = -0.12;
    scene.add(root);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const drag = {
      active: false,
      moved: false,
      lastX: 0,
      lastY: 0,
      startX: 0,
      startY: 0,
      azimuth: -0.9,
      elevation: 0.22,
      targetAzimuth: -0.9,
      targetElevation: 0.22,
      zoom: 0,
    };

    const cameraTarget = new THREE.Vector3();
    const cameraPositionTarget = new THREE.Vector3();
    const nodeGroups = new Map<string, THREE.Group>();
    const hitTargets: THREE.Mesh[] = [];
    const connectorMaterials: ConnectorMaterialSet[] = [];

    const particleField = createParticleField(4200);
    const crystalDust = createCrystalDust(170);
    const rings = createCrystariumRings();
    root.add(particleField);
    root.add(crystalDust);
    root.add(rings);

    const ambient = new THREE.AmbientLight(0x9fb7ff, 0.75);
    scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xe0ecff, 2.4);
    keyLight.position.set(1.5, 5.5, 5);
    scene.add(keyLight);

    const violetLight = new THREE.PointLight(0xa855f7, 14, 14);
    violetLight.position.set(0, 0.45, 1.4);
    scene.add(violetLight);

    const blueLight = new THREE.PointLight(0x3b82f6, 8, 13);
    blueLight.position.set(3.8, 1.1, 2.4);
    scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xec4899, 8, 13);
    pinkLight.position.set(-4.2, 1.4, 2.1);
    scene.add(pinkLight);

    const nodeById = new Map(sceneNodes.map((node) => [node.id, node]));

    for (const sceneNode of sceneNodes) {
      const group = createCrystalNode(sceneNode);
      group.position.set(...sceneNode.position);
      group.userData.nodeId = sceneNode.id;
      group.userData.kind = sceneNode.kind;
      group.userData.order = sceneNode.order;
      nodeGroups.set(sceneNode.id, group);
      root.add(group);

      const hitMesh = group.getObjectByName("hit-target") as THREE.Mesh;

      if (hitMesh) {
        hitTargets.push(hitMesh);
      }
    }

    for (const connector of [...CATEGORY_CONNECTORS, ...itemConnectors]) {
      const fromNode = nodeById.get(connector.from);
      const toNode = nodeById.get(connector.to);

      if (!fromNode || !toNode) {
        continue;
      }

      const connectorGroup = createEnergyPath(
        new THREE.Vector3(...fromNode.position),
        new THREE.Vector3(...toNode.position),
        CATEGORY_STYLES[connector.category].color,
        connector.from === HUB_ID
      );
      connectorGroup.userData.connector = connector;
      connectorMaterials.push({
        category: connector.category,
        from: connector.from,
        core: connectorGroup.userData.coreMaterial as THREE.MeshBasicMaterial,
        glow: connectorGroup.userData.glowMaterial as THREE.MeshBasicMaterial,
        pulse: connectorGroup.userData.pulseMaterial as THREE.MeshBasicMaterial,
      });
      root.add(connectorGroup);
    }

    const handleResize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;

      renderer.setSize(width, height, false);
      composer.setSize(width, height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      camera.aspect = width / Math.max(height, 1);
      camera.fov = width < 768 ? 54 : 45;
      camera.updateProjectionMatrix();
    };

    const setPointerFromEvent = (event: PointerEvent | MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
    };

    const handlePointerDown = (event: PointerEvent) => {
      drag.active = true;
      drag.moved = false;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.startX = event.clientX;
      drag.startY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    };

    const handlePointerMove = (event: PointerEvent) => {
      setPointerFromEvent(event);

      if (!drag.active) {
        return;
      }

      const deltaX = event.clientX - drag.lastX;
      const deltaY = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;

      if (
        Math.abs(event.clientX - drag.startX) > 4 ||
        Math.abs(event.clientY - drag.startY) > 4
      ) {
        drag.moved = true;
      }

      drag.targetAzimuth += deltaX / 180;
      drag.targetElevation = clamp(
        drag.targetElevation - deltaY / 240,
        -1.34,
        1.28
      );
    };

    const handlePointerUp = (event: PointerEvent) => {
      renderer.domElement.releasePointerCapture(event.pointerId);
      drag.active = false;

      if (drag.moved) {
        return;
      }

      setPointerFromEvent(event);
      raycaster.setFromCamera(pointer, camera);

      const intersections = raycaster.intersectObjects(
        hitTargets.filter((target) => target.visible),
        false
      );
      const selected = intersections.find((item) => {
        const id = item.object.userData.nodeId as string | undefined;
        const node = id ? nodeById.get(id) : null;
        return node?.kind === "category" || node?.kind === "item";
      });

      const id = selected?.object.userData.nodeId as string | undefined;
      const selectedNode = id ? nodeById.get(id) : null;

      if (selectedNode?.kind === "category" && selectedNode.category) {
        latestState.current.onToggleCategory(selectedNode.category);
      }

      if (
        selectedNode?.kind === "item" &&
        selectedNode.category === latestState.current.activeCategory
      ) {
        latestState.current.onSelectNode(selectedNode.id);
      }
    };

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      drag.zoom = clamp(drag.zoom + event.deltaY * 0.0011, -2.2, 2.4);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, {
      passive: false,
    });
    window.addEventListener("resize", handleResize);
    handleResize();

    let frame = 0;
    let rafId = 0;
    const startTime = performance.now();
    const transition = {
      category: latestState.current.activeCategory,
      startedAt: 0,
    };

    const animate = () => {
      const elapsed = (performance.now() - startTime) / 1000;
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      const mobile = width < 768;
      const { activeCategory: currentCategory, selectedNodeId: selectedId } =
        latestState.current;
      const focusedCount = currentCategory ? categoryCounts[currentCategory] : 0;

      drag.azimuth += (drag.targetAzimuth - drag.azimuth) * 0.08;
      drag.elevation += (drag.targetElevation - drag.elevation) * 0.08;

      if (transition.category !== currentCategory) {
        transition.category = currentCategory;
        transition.startedAt = elapsed;
      }

      const focus = currentCategory
        ? new THREE.Vector3(...CATEGORY_SCENE_POSITIONS[currentCategory])
        : new THREE.Vector3(0, 0.08, 0);

      cameraTarget.set(
        currentCategory ? focus.x : 0,
        currentCategory ? focus.y - 0.05 : focus.y,
        currentCategory ? focus.z : 0
      );

      const orbitRadius = mobile
        ? 14.2 + Math.max(0, focusedCount - 4) * 0.48 + drag.zoom
        : currentCategory
          ? 8.4 + Math.max(0, focusedCount - 4) * 0.42 + drag.zoom
          : 16.6 + drag.zoom;
      const orbitCos = Math.cos(drag.elevation);

      cameraPositionTarget.set(
        focus.x + Math.cos(drag.azimuth) * orbitRadius * orbitCos,
        focus.y + 0.8 + Math.sin(drag.elevation) * orbitRadius * 0.92,
        focus.z + Math.sin(drag.azimuth) * orbitRadius * orbitCos
      );

      camera.position.lerp(cameraPositionTarget, 0.052);
      camera.lookAt(cameraTarget);
      root.rotation.y = Math.sin(elapsed * 0.09) * 0.02;
      root.rotation.x = -0.12;
      particleField.rotation.y = elapsed * 0.004;
      crystalDust.rotation.y = elapsed * 0.025;
      crystalDust.rotation.x = Math.sin(elapsed * 0.16) * 0.06;
      rings.rotation.z = elapsed * 0.02;

      for (const sceneNode of sceneNodes) {
        const group = nodeGroups.get(sceneNode.id);

        if (!group) {
          continue;
        }

        const itemVisible =
          sceneNode.kind !== "item" || sceneNode.category === currentCategory;
        const selected = sceneNode.id === selectedId;
        const activeCategoryNode =
          sceneNode.kind === "category" && sceneNode.category === currentCategory;
        const revealProgress =
          sceneNode.kind === "item" && itemVisible
            ? smoothstep(
                clamp(
                  (elapsed - transition.startedAt - sceneNode.order * 0.035) /
                    0.72,
                  0,
                  1
                )
              )
            : 1;
        const targetScale = itemVisible
          ? selected || activeCategoryNode
            ? 1.12 * revealProgress
            : sceneNode.kind === "category" && currentCategory
              ? 0.88
              : revealProgress
          : 0.001;

        group.visible = group.scale.x > 0.025 || itemVisible;
        group.scale.lerp(
          new THREE.Vector3(targetScale, targetScale, targetScale),
          0.14
        );
        group.rotation.y += 0.004 + sceneNode.radius * 0.002;
        group.rotation.x = Math.sin(elapsed * 0.45 + sceneNode.position[0]) * 0.08;

        const core = group.getObjectByName("core") as THREE.Mesh | undefined;
        const halo = group.getObjectByName("halo") as THREE.Sprite | undefined;

        if (core?.material instanceof THREE.MeshPhysicalMaterial) {
          core.material.emissiveIntensity =
            0.9 + Math.sin(elapsed * 2.4 + sceneNode.position[0]) * 0.18;
        }

        if (halo) {
          const haloScale = sceneNode.radius * (3.4 + Math.sin(elapsed * 2.1) * 0.22);
          halo.scale.set(haloScale, haloScale, haloScale);
        }

        const hit = group.getObjectByName("hit-target") as THREE.Mesh | undefined;
        if (hit) {
          hit.visible = group.visible && itemVisible;
        }
      }

      for (const materialSet of connectorMaterials) {
        const itemPath = materialSet.from !== HUB_ID;
        const inactiveHubPath =
          materialSet.from === HUB_ID &&
          currentCategory &&
          materialSet.category !== currentCategory;
        const visibleItemPath =
          !itemPath || materialSet.category === currentCategory;
        const pulse =
          0.5 + Math.sin(elapsed * 2.8 + materialSet.category.length) * 0.5;

        materialSet.core.opacity = visibleItemPath
          ? inactiveHubPath
            ? 0.18
            : 0.78 + pulse * 0.12
          : Math.max(materialSet.core.opacity * 0.82, 0);
        materialSet.glow.opacity = visibleItemPath
          ? inactiveHubPath
            ? 0.08
            : 0.24 + pulse * 0.08
          : Math.max(materialSet.glow.opacity * 0.82, 0);
        materialSet.pulse.opacity = visibleItemPath
          ? inactiveHubPath
            ? 0
            : 0.18 + pulse * 0.42
          : Math.max(materialSet.pulse.opacity * 0.78, 0);
      }

      if (frame % 2 === 0) {
        updateLabels(labelRefs.current, nodeGroups, camera, width, height);
      }

      bloomPass.strength = mobile ? 0.4 : 0.5;
      composer.render();
      frame += 1;
      rafId = window.requestAnimationFrame(animate);
    };

    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.dispose();
      composer.dispose();
      disposeObject(scene);
      renderer.domElement.remove();
    };
  }, [categoryCounts, itemConnectors, sceneNodes]);

  return (
    <section className="relative h-screen w-screen overflow-hidden">
      <div ref={mountRef} className="absolute inset-0 cursor-grab active:cursor-grabbing" />

      <div
        ref={(element) => setLabelRef(labelRefs.current, HUB_ID, element)}
        className="pointer-events-none absolute left-0 top-0 opacity-0"
      >
        <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-violet-300/80 bg-violet-500/15 text-3xl font-bold text-violet-100 shadow-[0_0_34px_rgba(168,85,247,0.56)] backdrop-blur">
          0x
        </div>
      </div>

      {CATEGORY_ORDER.map((category) => {
        const style = CATEGORY_STYLES[category];
        const categoryItems = nodes.filter((node) => node.category === category);
        const health = categoryHealth(categoryItems);
        const status = STATUS_STYLES[health];
        const count = categoryItems.length;
        const hideInactiveMobileCategory =
          viewportWidth > 0 &&
          viewportWidth < 768 &&
          activeCategory !== null &&
          activeCategory !== category;

        if (hideInactiveMobileCategory) {
          return null;
        }

        return (
          <button
            key={category}
            ref={(element) =>
              setLabelRef(labelRefs.current, CATEGORY_NODE_IDS[category], element)
            }
            type="button"
            onClick={() => onToggleCategory(category)}
            aria-expanded={activeCategory === category}
            className={`absolute left-0 top-0 min-w-[108px] rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-2 text-left opacity-0 shadow-2xl backdrop-blur-md transition hover:border-white/25 hover:bg-slate-900/80 sm:min-w-[150px] sm:px-3 ${
              activeCategory === category ? "ring-1 ring-white/50" : ""
            }`}
          >
            <span
              className={`block text-[11px] font-bold uppercase tracking-[0.18em] sm:text-xs ${style.accentClass}`}
            >
              {style.title}
            </span>
            <span className="mt-1 flex items-center gap-2.5 text-[10px] text-slate-300 sm:gap-3 sm:text-[11px]">
              <span>
                {count} {count === 1 ? "item" : "items"}
              </span>
              <span className="flex items-center gap-1.5">
                <span className={`h-1.5 w-1.5 rounded-full ${status.dotClass}`} />
                <span className={status.textClass}>{status.label}</span>
              </span>
            </span>
          </button>
        );
      })}

      {nodes
        .filter((node) => node.category === activeCategory)
        .map((node, index) => {
          const status = STATUS_STYLES[node.status];
          const style = CATEGORY_STYLES[node.category];
          const denseCategory =
            activeCategory != null && categoryCounts[activeCategory] > 6;
          const sparseMobileLabel =
            viewportWidth > 0 &&
            viewportWidth < 768 &&
            denseCategory &&
            activeCategory === "extensions" &&
            index % 3 !== 0 &&
            selectedNodeId !== node.id;

          if (sparseMobileLabel) {
            return null;
          }

          return (
            <button
              key={node.id}
              ref={(element) => setLabelRef(labelRefs.current, node.id, element)}
              type="button"
              onClick={() => onSelectNode(node.id)}
              aria-pressed={selectedNodeId === node.id}
              className={`absolute left-0 top-0 rounded-lg border bg-slate-950/68 px-3 py-2 text-left opacity-0 shadow-2xl backdrop-blur-md transition hover:bg-slate-900/90 ${
                denseCategory
                  ? "min-w-[108px] sm:min-w-[136px]"
                  : "min-w-[144px] sm:min-w-[170px]"
              } ${
                selectedNodeId === node.id
                  ? `${style.borderClass} ring-1 ring-white/50`
                  : "border-white/10"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <span
                  className={`block font-bold text-white ${
                    denseCategory ? "text-[12px] leading-4 sm:text-[13px]" : "text-sm leading-5"
                  }`}
                >
                  {node.title}
                </span>
                {denseCategory && (
                  <span
                    className={`mt-1 h-2 w-2 shrink-0 rounded-full ${status.dotClass}`}
                  />
                )}
              </div>
              {!denseCategory && (
                <span className="mt-1 flex items-center gap-2 text-xs">
                  <span className={`h-2 w-2 rounded-full ${status.dotClass}`} />
                  <span className={status.textClass}>{status.label}</span>
                </span>
              )}
              {!denseCategory && node.metrics[0] && (
                <span className="mt-1 block max-w-[190px] truncate text-xs text-slate-300">
                  {node.metrics[0].value}
                </span>
              )}
            </button>
          );
        })}

      <div className="pointer-events-none absolute bottom-5 left-1/2 hidden -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/55 px-4 py-2 text-xs text-slate-300 backdrop-blur-md sm:flex sm:items-center sm:gap-4">
        {CATEGORY_ORDER.map((category) => (
          <span key={category} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{
                background: CATEGORY_STYLES[category].colorHex,
                boxShadow: `0 0 14px ${CATEGORY_STYLES[category].colorHex}`,
              }}
            />
            {CATEGORY_STYLES[category].title}
          </span>
        ))}
      </div>
    </section>
  );
}

function createCrystalNode(sceneNode: SceneNode) {
  const color = new THREE.Color(sceneNode.color);
  const group = new THREE.Group();

  const coreGeometry = new THREE.OctahedronGeometry(sceneNode.radius, 2);
  const coreMaterial = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: sceneNode.kind === "hub" ? 1.08 : 0.8,
    metalness: 0.12,
    roughness: 0.16,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0.76 : 0.7,
    transmission: 0.18,
    thickness: 1.6,
    clearcoat: 1,
    clearcoatRoughness: 0.16,
  });
  const core = new THREE.Mesh(coreGeometry, coreMaterial);
  core.name = "core";
  group.add(core);

  const shellMaterial = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: sceneNode.kind === "hub" ? 0.28 : 0.2,
    metalness: 0.02,
    roughness: 0.04,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0.14 : 0.12,
    transmission: 0.46,
    thickness: 2.4,
    clearcoat: 1,
    clearcoatRoughness: 0.08,
    depthWrite: false,
  });
  const shell = new THREE.Mesh(
    new THREE.IcosahedronGeometry(sceneNode.radius * 1.28, 1),
    shellMaterial
  );
  shell.rotation.set(0.35, 0.22, 0.12);
  group.add(shell);

  const wireGeometry = new THREE.IcosahedronGeometry(sceneNode.radius * 1.38, 1);
  const wireMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0.34 : 0.28,
    wireframe: true,
  });
  group.add(new THREE.Mesh(wireGeometry, wireMaterial));

  const innerGeometry = new THREE.TetrahedronGeometry(sceneNode.radius * 0.58, 0);
  const innerMaterial = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0.16 : 0.12,
    blending: THREE.AdditiveBlending,
  });
  group.add(new THREE.Mesh(innerGeometry, innerMaterial));

  const shardMaterial = new THREE.MeshPhysicalMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.46,
    roughness: 0.2,
    transparent: true,
    opacity: 0.52,
    transmission: 0.2,
    thickness: 1.1,
    depthWrite: false,
  });
  const shardCount = sceneNode.kind === "hub" ? 10 : 6;
  for (let index = 0; index < shardCount; index += 1) {
    const angle = (Math.PI * 2 * index) / shardCount;
    const vertical = index % 2 === 0 ? 0.34 : -0.28;
    const shard = new THREE.Mesh(
      new THREE.ConeGeometry(
        sceneNode.radius * 0.12,
        sceneNode.radius * (sceneNode.kind === "hub" ? 0.72 : 0.5),
        4,
        1
      ),
      shardMaterial
    );
    shard.position.set(
      Math.cos(angle) * sceneNode.radius * 1.28,
      vertical * sceneNode.radius,
      Math.sin(angle) * sceneNode.radius * 1.05
    );
    shard.rotation.set(
      Math.sin(angle) * 0.72,
      angle,
      Math.cos(angle) * 0.62
    );
    group.add(shard);
  }

  const glowTexture = createGlowTexture(sceneNode.colorHex);
  const haloMaterial = new THREE.SpriteMaterial({
    map: glowTexture,
    color,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0.32 : 0.24,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const halo = new THREE.Sprite(haloMaterial);
  halo.name = "halo";
  halo.scale.set(sceneNode.radius * 3.4, sceneNode.radius * 3.4, 1);
  group.add(halo);

  const statusMaterial = new THREE.MeshBasicMaterial({
    color: STATUS_STYLES[sceneNode.status].color,
    transparent: true,
    opacity: sceneNode.kind === "hub" ? 0 : 0.95,
  });
  const statusDot = new THREE.Mesh(
    new THREE.SphereGeometry(sceneNode.radius * 0.14, 18, 18),
    statusMaterial
  );
  statusDot.position.set(0, -sceneNode.radius * 1.1, sceneNode.radius * 0.45);
  group.add(statusDot);

  const hitTarget = new THREE.Mesh(
    new THREE.SphereGeometry(sceneNode.radius * 1.85, 20, 20),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    })
  );
  hitTarget.name = "hit-target";
  hitTarget.userData.nodeId = sceneNode.id;
  group.add(hitTarget);

  return group;
}

function createEnergyPath(
  from: THREE.Vector3,
  to: THREE.Vector3,
  colorValue: number,
  hubPath: boolean
) {
  const group = new THREE.Group();
  const color = new THREE.Color(colorValue);
  const pulseColor = color.clone().lerp(new THREE.Color(0xffffff), 0.28);
  const midpoint = from.clone().lerp(to, 0.5);
  midpoint.z += hubPath ? 0.38 : 0.52;
  midpoint.y += hubPath ? 0.22 : 0.12;

  const curve = new THREE.CatmullRomCurve3([from, midpoint, to]);
  const tube = new THREE.TubeGeometry(curve, 96, hubPath ? 0.03 : 0.024, 10);
  const glowTube = new THREE.TubeGeometry(curve, 96, hubPath ? 0.07 : 0.058, 10);
  const pulseTube = new THREE.TubeGeometry(curve, 96, hubPath ? 0.04 : 0.032, 10);

  const glowMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.14,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const coreMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const pulseMaterial = new THREE.MeshBasicMaterial({
    color: pulseColor,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  group.add(new THREE.Mesh(glowTube, glowMaterial));
  group.add(new THREE.Mesh(tube, coreMaterial));
  group.add(new THREE.Mesh(pulseTube, pulseMaterial));
  group.userData.coreMaterial = coreMaterial;
  group.userData.glowMaterial = glowMaterial;
  group.userData.pulseMaterial = pulseMaterial;

  return group;
}

function createCrystariumRings() {
  const group = new THREE.Group();

  for (const [index, radius] of [1.2, 2.45, 3.65].entries()) {
    const material = new THREE.MeshBasicMaterial({
      color: index === 0 ? 0xa855f7 : 0x60a5fa,
      transparent: true,
      opacity: index === 0 ? 0.34 : 0.13,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(radius, index === 0 ? 0.018 : 0.01, 8, 160),
      material
    );
    ring.rotation.x = Math.PI / 2.15;
    ring.rotation.z = index * 0.18;
    group.add(ring);
  }

  const plateMaterial = new THREE.MeshBasicMaterial({
    color: 0x7c3aed,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const plate = new THREE.Mesh(new THREE.CircleGeometry(1.25, 80), plateMaterial);
  plate.rotation.x = Math.PI / 2.12;
  group.add(plate);

  return group;
}

function createParticleField(count: number) {
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);

  for (let index = 0; index < count; index += 1) {
    const i = index * 3;
    positions[i] = (Math.random() - 0.5) * 46;
    positions[i + 1] = (Math.random() - 0.5) * 30;
    positions[i + 2] = (Math.random() - 0.5) * 38 - 4;

    const color = new THREE.Color().setHSL(
      0.58 + Math.random() * 0.17,
      0.55,
      0.66 + Math.random() * 0.18
    );
    colors[i] = color.r;
    colors[i + 1] = color.g;
    colors[i + 2] = color.b;
  }

  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.02,
    vertexColors: true,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });

  return new THREE.Points(geometry, material);
}

function createCrystalDust(count: number) {
  const group = new THREE.Group();
  const material = new THREE.MeshBasicMaterial({
    color: 0xc4b5fd,
    transparent: true,
    opacity: 0.18,
    wireframe: true,
    blending: THREE.AdditiveBlending,
  });

  for (let index = 0; index < count; index += 1) {
    const shard = new THREE.Mesh(new THREE.TetrahedronGeometry(0.035, 0), material);
    shard.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 5 - 0.8
    );
    shard.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
    group.add(shard);
  }

  return group;
}

function createGlowTexture(color: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");

  if (!context) {
    return new THREE.CanvasTexture(canvas);
  }

  const gradient = context.createRadialGradient(64, 64, 0, 64, 64, 64);
  gradient.addColorStop(0, "rgba(255,255,255,0.95)");
  gradient.addColorStop(0.22, `${hexToRgba(color, 0.7)}`);
  gradient.addColorStop(0.58, `${hexToRgba(color, 0.24)}`);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateLabels(
  refs: Map<string, LabelElement>,
  nodeGroups: Map<string, THREE.Group>,
  camera: THREE.Camera,
  width: number,
  height: number
) {
  const topInset = width < 768 ? 138 : 96;
  const bottomInset = width < 768 ? 112 : 24;

  for (const [id, element] of refs) {
    const group = nodeGroups.get(id);

    if (!group || !group.visible || group.scale.x < 0.04) {
      element.style.opacity = "0";
      element.style.pointerEvents = "none";
      continue;
    }

    SCRATCH_VECTOR.setFromMatrixPosition(group.matrixWorld).project(camera);
    const visible = SCRATCH_VECTOR.z < 1;
    const x = (SCRATCH_VECTOR.x * 0.5 + 0.5) * width;
    const y = (-SCRATCH_VECTOR.y * 0.5 + 0.5) * height;
    const categoryLabel = id.startsWith("category-");
    const belowOffset =
      id === HUB_ID ? -10 : categoryLabel && width < 768 ? 94 : 62;
    const halfWidth = element.offsetWidth / 2 || 80;
    const halfHeight = element.offsetHeight / 2 || 28;
    const clampedX = clamp(x, halfWidth + 10, width - halfWidth - 10);
    const clampedY = clamp(
      y + belowOffset,
      halfHeight + topInset,
      height - halfHeight - bottomInset
    );

    element.style.opacity = visible ? `${Math.min(1, group.scale.x * 2.2)}` : "0";
    element.style.pointerEvents = visible && id !== HUB_ID ? "auto" : "none";
    element.style.left = `${clampedX}px`;
    element.style.top = `${clampedY}px`;
    element.style.transform = "translate(-50%, -50%)";
  }
}

function setLabelRef(
  refs: Map<string, LabelElement>,
  id: string,
  element: LabelElement | null
) {
  if (element) {
    refs.set(id, element);
  } else {
    refs.delete(id);
  }
}

function disposeObject(object: THREE.Object3D) {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;

    if (mesh.geometry) {
      mesh.geometry.dispose();
    }

    const materials = Array.isArray(mesh.material)
      ? mesh.material
      : mesh.material
        ? [mesh.material]
        : [];

    for (const material of materials) {
      for (const value of Object.values(material)) {
        if (value instanceof THREE.Texture) {
          value.dispose();
        }
      }
      material.dispose();
    }
  });
}

function hexToRgba(hex: string, alpha: number) {
  const clean = hex.replace("#", "");
  const red = parseInt(clean.slice(0, 2), 16);
  const green = parseInt(clean.slice(2, 4), 16);
  const blue = parseInt(clean.slice(4, 6), 16);

  return `rgba(${red},${green},${blue},${alpha})`;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value: number) {
  return value * value * (3 - 2 * value);
}
