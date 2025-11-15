import React, { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Transformer } from "react-konva";
import Konva from "konva";
import type {
  AnchorDescriptor,
  Connection,
  IntermediatePoint,
  Point,
  Shape,
} from "../../../types";
import { GridBackground } from "./Grid";
import { anchorToPoint, createAnchor } from "../utils/anchor";
import { Header } from "./Header";
import { ShapeComponent } from "./Shape";
import { ConnectionLine } from "./Connection";
import { Circle as KonvaCircle } from "react-konva";
import { distance, snapDeltaTo8 } from "../utils/helpers";

/* ---------- Main Component ---------- */
const STROKE = "#222";
const STROKE_WIDTH = 2;
const CLAMP_MARGIN = 12;

export const Main: React.FC = () => {
  const [size, setSize] = useState({
    w: window.innerWidth,
    h: window.innerHeight - 108,
  });
  const [scale, setScale] = useState(1);
  const scaleRef = useRef(1);
  const [shapes, setShapes] = useState<Shape[]>([
    {
      id: crypto.randomUUID(),
      name: "rectangle 1",
      type: "rect",
      x: 100,
      y: 150,
      fill: "",
      width: 120,
      height: 80,
    },
    {
      id: crypto.randomUUID(),
      name: "circle 1",
      type: "circle",
      x: 400,
      y: 200,
      fill: "",
      radius: 50,
    },
    {
      id: crypto.randomUUID(),
      name: "triangle 1",
      type: "triangle",
      x: 700,
      y: 200,
      fill: "",
      radius: 70,
    },
  ]);
  const [connections, setConnections] = useState<Connection[]>([]);
  // persistence key
  const STORAGE_KEY = "circuit-designer-state";
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingFrom, setDrawingFrom] = useState<AnchorDescriptor | null>(null);
  const [intermediatePoints, setIntermediatePoints] = useState<
    IntermediatePoint[]
  >([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // When we auto-form polygons from lines, we may need to temporarily suppress
  // the auto-formation (so undo doesn't immediately re-form). This ref is used
  // to skip the auto-form effect while performing undo operations.
  const suppressAutoFormRef = useRef(false);

  // Panning refs
  const spacePressedRef = useRef(false);
  const shiftPressedRef = useRef(false);
  const isPanningRef = useRef(false);
  const panStartRef = useRef<Point | null>(null);
  const panStageStartRef = useRef<Point>({ x: 0, y: 0 });

  const layerRef = useRef<Konva.Layer | null>(null);
  const stageRef = useRef<Konva.Stage | null>(null);
  const transformerRef = useRef<Konva.Transformer | null>(null);
  const shapeRefs = useRef<Record<string, Konva.Node | null>>({});
  const clipboardRef = useRef<Shape | null>(null);

  // Undo/redo history (store snapshots of shapes + connections)
  const historyRef = useRef<
    Array<{ shapes: Shape[]; connections: Connection[] }>
  >([]);
  const futureRef = useRef<
    Array<{ shapes: Shape[]; connections: Connection[] }>
  >([]);

  const pushHistory = useCallback(() => {
    historyRef.current.push({
      shapes: JSON.parse(JSON.stringify(shapes)),
      connections: JSON.parse(JSON.stringify(connections)),
    });
    // cap history to reasonable size
    if (historyRef.current.length > 100) historyRef.current.shift();
    // clear redo stack
    futureRef.current = [];
  }, [shapes, connections]);

  // Load persisted state on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as {
        shapes?: Shape[];
        connections?: Connection[];
        stage?: { x?: number; y?: number; scale?: number };
      } | null;
      if (!data) return;
      if (Array.isArray(data.shapes)) setShapes(data.shapes);
      if (Array.isArray(data.connections)) setConnections(data.connections);
      // restore stage transform if present
      if (data.stage && stageRef.current) {
        try {
          const st = stageRef.current;
          const s = data.stage.scale ?? undefined;
          if (typeof s === "number") {
            st.scale({ x: s, y: s });
            setScale(s);
          }
          if (
            typeof data.stage.x === "number" &&
            typeof data.stage.y === "number"
          ) {
            st.position({ x: data.stage.x, y: data.stage.y });
          }
          st.batchDraw();
        } catch (err) {
          void err;
        }
      }
    } catch (err) {
      void err;
    }
  }, []);

  // Save state on changes (debounced)
  useEffect(() => {
    let t: number | null = null;
    const save = () => {
      try {
        const st = stageRef.current;
        const stage = st
          ? { x: st.x() ?? 0, y: st.y() ?? 0, scale: st.scaleX() ?? 1 }
          : undefined;
        const payload = JSON.stringify({ shapes, connections, stage });
        localStorage.setItem(STORAGE_KEY, payload);
      } catch (err) {
        void err;
      }
    };
    // small debounce
    t = window.setTimeout(save, 200);
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [shapes, connections]);

  const resetAll = useCallback(() => {
    pushHistory();
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      void err;
    }
    // restore default starter shapes
    setShapes([
      {
        id: crypto.randomUUID(),
        name: "rectangle 1",
        type: "rect",
        x: 100,
        y: 150,
        fill: "",
        width: 120,
        height: 80,
      },
      {
        id: crypto.randomUUID(),
        name: "circle 1",
        type: "circle",
        x: 400,
        y: 200,
        fill: "",
        radius: 50,
      },
      {
        id: crypto.randomUUID(),
        name: "triangle 1",
        type: "triangle",
        x: 700,
        y: 200,
        fill: "",
        radius: 70,
      },
    ]);
    setConnections([]);
    // reset stage transform
    try {
      const st = stageRef.current;
      if (st) {
        st.scale({ x: 1, y: 1 });
        st.position({ x: 0, y: 0 });
        st.batchDraw();
        setScale(1);
      }
    } catch (err) {
      void err;
    }
  }, [pushHistory]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) return;

    // If current state contains an auto-generated polygon, suppress the
    // auto-formation while we perform the undo to avoid it re-creating.
    const hasGenerated = shapes.some(
      (s) => s.type === "polygon" && s.generatedFromLines
    );
    if (hasGenerated) suppressAutoFormRef.current = true;

    const last = historyRef.current.pop()!;
    futureRef.current.push({
      shapes: JSON.parse(JSON.stringify(shapes)),
      connections: JSON.parse(JSON.stringify(connections)),
    });
    setShapes(last.shapes);
    setConnections(last.connections);

    // allow other effects to run again shortly after
    if (hasGenerated)
      setTimeout(() => (suppressAutoFormRef.current = false), 50);
  }, [shapes, connections]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    historyRef.current.push({
      shapes: JSON.parse(JSON.stringify(shapes)),
      connections: JSON.parse(JSON.stringify(connections)),
    });
    setShapes(next.shapes);
    setConnections(next.connections);
  }, [shapes, connections]);

  const SNAP_THRESHOLD = 15; // pixels

  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight - 108 });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [pushHistory]);

  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = shapeRefs.current[selectedId] as Konva.Node | undefined;
      if (node && transformerRef.current) {
        transformerRef.current.nodes([node]);
        // Configure transformer anchors depending on shape type
        const selShape = shapes.find((s) => s.id === selectedId);
        if (selShape?.type === "line") {
          transformerRef.current.enabledAnchors([
            "middle-left",
            "middle-right",
          ] as unknown as string[]);
        } else {
          transformerRef.current.enabledAnchors([
            "top-left",
            "top-center",
            "top-right",
            "middle-right",
            "bottom-right",
            "bottom-center",
            "bottom-left",
            "middle-left",
          ] as unknown as string[]);
        }
        transformerRef.current.getLayer()?.batchDraw();
      }
    }
  }, [selectedId, shapes]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        if (selectedId) {
          // remove selected shape and related connections
          pushHistory();
          setShapes((prev) => prev.filter((s) => s.id !== selectedId));
          setConnections((prev) =>
            prev.filter(
              (c) =>
                c.from.shapeId !== selectedId && c.to.shapeId !== selectedId
            )
          );
          setSelectedId(null);
        }
      }
      // Cancel drawing with Escape
      if (e.key === "Escape") {
        if (isDrawing) {
          setIsDrawing(false);
          setDrawingFrom(null);
          setIntermediatePoints([]);
        }
      }
      // Undo/Redo: Ctrl/Cmd+Z and Ctrl/Cmd+Shift+Z
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
        if (selectedId) {
          const s = shapes.find((sh) => sh.id === selectedId);
          if (s) clipboardRef.current = { ...s };
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
        if (clipboardRef.current) {
          pushHistory();
          const copy = {
            ...clipboardRef.current,
            id: crypto.randomUUID(),
            x: (clipboardRef.current.x || 200) + 20,
            y: (clipboardRef.current.y || 200) + 20,
          } as Shape;
          setShapes((prev) => [...prev, copy]);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = false;
      // keep track of shift release as well
      if (e.key === "Shift") shiftPressedRef.current = false;
    };

    if (selectedId && transformerRef.current) {
      const node = shapeRefs.current[selectedId] as Konva.Node | undefined;
      if (node && transformerRef.current) {
        transformerRef.current.nodes([node]);

        const selShape = shapes.find((s) => s.id === selectedId);
        if (selShape?.type === "line") {
          transformerRef.current.enabledAnchors([
            "middle-left",
            "middle-right",
          ]);
          transformerRef.current.rotateEnabled(true);
        } else {
          transformerRef.current.enabledAnchors([
            "top-left",
            "top-center",
            "top-right",
            "middle-right",
            "bottom-right",
            "bottom-center",
            "bottom-left",
            "middle-left",
          ]);
          transformerRef.current.rotateEnabled(true);
        }
        transformerRef.current.getLayer()?.batchDraw();
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = true;
      // track shift state
      shiftPressedRef.current = e.shiftKey;
      handleKey(e);
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [selectedId, shapes, pushHistory, redo, undo, isDrawing]);

  useEffect(() => {
    scaleRef.current = scale;
  }, [scale]);

  // ensure stage reflects scale whenever state changes (imperative to avoid flicker)
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    st.scale({ x: scale, y: scale });
    st.batchDraw();
  }, [scale]);

  // attach a non-passive wheel listener to the stage container for zooming
  useEffect(() => {
    let attached = false;
    let cleanup: (() => void) | null = null;
    const tryAttach = () => {
      const stage = stageRef.current;
      if (!stage) return;
      const container = stage.container();
      if (!container) return;

      const onWheel = (ev: WheelEvent) => {
        if (!(ev.ctrlKey || ev.metaKey)) return;
        ev.preventDefault();
        const st = stageRef.current;
        if (!st) return;
        const oldScale = scaleRef.current;
        const pointer = st.getPointerPosition();
        if (!pointer) return;
        // multiplicative exponential zoom for smoother feel
        const zoomFactor = Math.pow(1.0015, -ev.deltaY);
        const newScale = Math.max(0.1, Math.min(4, oldScale * zoomFactor));
        const mousePointTo = {
          x: (pointer.x - (st.x() ?? 0)) / oldScale,
          y: (pointer.y - (st.y() ?? 0)) / oldScale,
        };
        const newPos = {
          x: pointer.x - mousePointTo.x * newScale,
          y: pointer.y - mousePointTo.y * newScale,
        };
        // apply immediately to stage to avoid flicker
        st.scale({ x: newScale, y: newScale });
        st.position(newPos);
        st.batchDraw();
        // then reflect into React state
        setScale(newScale);
      };

      container.addEventListener("wheel", onWheel, { passive: false });
      cleanup = () =>
        container.removeEventListener("wheel", onWheel as EventListener);
      attached = true;
    };

    const interval = setInterval(() => {
      if (!attached) tryAttach();
      if (attached) clearInterval(interval);
    }, 100);

    return () => {
      clearInterval(interval);
      if (cleanup) cleanup();
    };
  }, []);

  // Handle native drag/drop onto the stage container to add shapes
  useEffect(() => {
    let mounted = true;
    let attached = false;
    let onDragOver: ((ev: DragEvent) => void) | null = null;
    let onDrop: ((ev: DragEvent) => void) | null = null;
    let attachedContainer: HTMLElement | null = null;
    const interval = setInterval(() => {
      if (!mounted || attached) return;
      const stage = stageRef.current;
      if (!stage) return;
      const container = stage.container();
      if (!container) return;

      onDragOver = (ev: DragEvent) => {
        ev.preventDefault();
        try {
          ev.dataTransfer!.dropEffect = "copy";
        } catch (err) {
          void err;
        }
      };

      onDrop = (ev: DragEvent) => {
        ev.preventDefault();
        try {
          let text = ev.dataTransfer?.getData("application/json");
          if (!text) {
            text = ev.dataTransfer?.getData("text/plain") || "";
          }
          if (!text) return;
          const payload = JSON.parse(text) as { type?: string } | null;
          if (!payload || !payload.type) return;

          const rect = container.getBoundingClientRect();
          const x = ev.clientX - rect.left;
          const y = ev.clientY - rect.top;

          const layer = layerRef.current;
          let local = { x, y };
          if (layer) {
            const layerTrRaw = (
              layer as unknown as { getAbsoluteTransform?: () => unknown }
            ).getAbsoluteTransform?.();
            if (
              layerTrRaw &&
              typeof layerTrRaw === "object" &&
              layerTrRaw !== null &&
              "copy" in layerTrRaw &&
              typeof (layerTrRaw as { copy?: unknown }).copy === "function"
            ) {
              try {
                const layerTr = layerTrRaw as {
                  copy: () => { invert: () => { point?: (p: Point) => Point } };
                };
                const inv = layerTr.copy().invert();
                if (typeof (inv as { point?: unknown }).point === "function")
                  local = (inv as { point: (p: Point) => Point }).point({
                    x,
                    y,
                  });
              } catch (err) {
                void err;
                local = { x, y };
              }
            }
          }

          const colors = ["#f66", "#6f6", "#66f", "#ff6", "#f6f", "#6ff"];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];
          type Payload = {
            type?: string;
            fill?: string;
            shapeProps?: Partial<Shape>;
          };
          const p = payload as Payload | null;
          const type = (p?.type as Shape["type"]) ?? ("rect" as Shape["type"]);
          const fill = p?.fill || randomColor;
          const shapePropsFromPayload = p?.shapeProps || {};
          const newShape: Shape = {
            id:
              typeof crypto !== "undefined" &&
              typeof (crypto as unknown as { randomUUID?: () => string })
                .randomUUID === "function"
                ? (crypto as unknown as { randomUUID?: () => string })
                    .randomUUID!()
                : `shape-${Date.now()}`,
            type,
            x: local.x,
            y: local.y,
            fill: fill,
            name:
              shapePropsFromPayload.name ||
              type + " " + Math.floor(Math.random() * 1000),
            ...((type === "rect" && { width: 120, height: 80 }) || {}),
            ...((type === "circle" && { radius: 50 }) || {}),
            ...((type === "triangle" && { radius: 70 }) || {}),
            ...((type === "line" && { radius: 100 }) || {}),
            ...shapePropsFromPayload,
          } as Shape;

          pushHistory();
          setShapes((prev) => [...prev, newShape]);
        } catch (err) {
          void err;
          // ignore malformed payloads
        }
      };

      container.addEventListener("dragover", onDragOver!);
      container.addEventListener("drop", onDrop!);
      attached = true;
      attachedContainer = container;
    }, 100);

    return () => {
      mounted = false;
      clearInterval(interval);
      try {
        if (attachedContainer) {
          if (onDragOver)
            attachedContainer.removeEventListener("dragover", onDragOver);
          if (onDrop) attachedContainer.removeEventListener("drop", onDrop);
        }
      } catch (err) {
        void err;
      }
    };
  }, [pushHistory]);

  const addShape = (type: Shape["type"]) => {
    // const colors = ["#f66", "#6f6", "#66f", "#ff6", "#f6f", "#6ff"];
    // const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const newShape: Shape = {
      id:
        typeof crypto !== "undefined" &&
        typeof (crypto as unknown as { randomUUID?: () => string })
          .randomUUID === "function"
          ? (crypto as unknown as { randomUUID?: () => string }).randomUUID!()
          : `shape-${Date.now()}`,
      type,
      x: 200 + Math.random() * 300,
      y: 200 + Math.random() * 200,
      fill: "",
      name: type + " " + Math.floor(Math.random() * 1000),
      ...(type === "rect" && { width: 120, height: 80 }),
      ...(type === "circle" && { radius: 50 }),
      ...(type === "triangle" && { radius: 70 }),
      ...(type === "line" && { radius: 100 }),
    };
    pushHistory();
    setShapes((prev) => [...prev, newShape]);
  };

  function findNearestShape(p: Point): Konva.Node | null {
    const layer = layerRef.current;
    if (!layer) return null;
    const children = layer.getChildren();
    for (const node of children) {
      const cls = node.getClassName();
      if (!["Rect", "Circle", "RegularPolygon", "Line"].includes(cls)) continue;
      // ignore nodes that do not have an id or are not in our shapes state
      const nid =
        typeof node.id === "function"
          ? node.id()
          : (node as unknown as { id?: string }).id;
      if (!nid) continue;
      // allow both shapes and connections to be valid targets
      const isShape = shapes.some((s) => s.id === nid);
      const isConnection = connections.some((c) => c.id === nid);
      if (!isShape && !isConnection) continue;

      const r = node.getClientRect();
      const box = {
        x: r.x - CLAMP_MARGIN,
        y: r.y - CLAMP_MARGIN,
        w: r.width + CLAMP_MARGIN * 2,
        h: r.height + CLAMP_MARGIN * 2,
      };
      if (
        p.x >= box.x &&
        p.x <= box.x + box.w &&
        p.y >= box.y &&
        p.y <= box.y + box.h
      ) {
        return node;
      }
    }
    return null;
  }

  const handleClick = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const nearest = findNearestShape(pos);

    if (!isDrawing) {
      // Start only if a shape is selected and click is on that shape
      if (!selectedId || !nearest || nearest.id() !== selectedId) {
        // if clicked empty area, deselect
        if (!nearest) setSelectedId(null);
        return;
      }
      const anchor = createAnchor(nearest, pos.x, pos.y);
      setDrawingFrom(anchor);
      setIsDrawing(true);
      setIntermediatePoints([]);
    } else {
      if (nearest && drawingFrom && nearest.id() !== drawingFrom.shapeId) {
        // End on a different shape
        const toAnchor = createAnchor(nearest, pos.x, pos.y);
        pushHistory();
        setConnections((prev) => [
          ...prev,
          {
            id: `conn-${Date.now()}`,
            from: drawingFrom!,
            to: toAnchor,
            intermediatePoints: [...intermediatePoints],
          },
        ]);
        setIsDrawing(false);
        setDrawingFrom(null);
        setIntermediatePoints([]);
      } else if (!nearest) {
        // Add intermediate point (convert stage pointer to layer-local coords)
        const layer = layerRef.current;
        let local = { x: pos.x, y: pos.y };
        if (layer) {
          const layerTrRaw = (
            layer as unknown as { getAbsoluteTransform?: () => unknown }
          ).getAbsoluteTransform?.();
          if (
            layerTrRaw &&
            typeof layerTrRaw === "object" &&
            layerTrRaw !== null &&
            "copy" in layerTrRaw &&
            typeof (layerTrRaw as { copy?: unknown }).copy === "function"
          ) {
            try {
              const layerTr = layerTrRaw as {
                copy: () => { invert: () => { point?: (p: Point) => Point } };
              };
              const inv = layerTr.copy().invert();
              if (typeof (inv as { point?: unknown }).point === "function")
                local = (inv as { point: (p: Point) => Point }).point(pos);
            } catch (err) {
              void err;
              local = { x: pos.x, y: pos.y };
            }
          }
        }
        // record intermediate point addition in history
        pushHistory();
        setIntermediatePoints((prev) => [...prev, { x: local.x, y: local.y }]);
      }
    }
  };

  const handleMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getPointerPosition();
    if (!p) return;
    // convert pointer position into layer-local coords so preview aligns under zoom/transform
    const layer = layerRef.current;
    let local = { x: p.x, y: p.y };
    if (layer) {
      const layerTrRaw = (
        layer as unknown as { getAbsoluteTransform?: () => unknown }
      ).getAbsoluteTransform?.();
      if (
        layerTrRaw &&
        typeof layerTrRaw === "object" &&
        layerTrRaw !== null &&
        "copy" in layerTrRaw &&
        typeof (layerTrRaw as { copy?: unknown }).copy === "function"
      ) {
        try {
          const layerTr = layerTrRaw as {
            copy: () => { invert: () => { point?: (p: Point) => Point } };
          };
          const inv = layerTr.copy().invert();
          if (typeof (inv as { point?: unknown }).point === "function")
            local = (inv as { point: (p: Point) => Point }).point(p);
        } catch (err) {
          void err;
          local = { x: p.x, y: p.y };
        }
      }
    }
    // If drawing and shift is held, snap the preview endpoint to 8 directions
    if (isDrawing && drawingFrom && shiftPressedRef.current) {
      try {
        let lastPoint = null as Point | null;
        if (intermediatePoints.length > 0) {
          lastPoint = intermediatePoints[intermediatePoints.length - 1];
        } else {
          // derive point from drawingFrom anchor
          if (layer) lastPoint = anchorToPoint(layer, drawingFrom);
        }
        if (lastPoint) {
          const dx = local.x - lastPoint.x;
          const dy = local.y - lastPoint.y;
          const snapped = snapDeltaTo8(dx, dy);
          local = { x: lastPoint.x + snapped.x, y: lastPoint.y + snapped.y };
        }
      } catch (err) {
        void err;
      }
    }
    setMousePos(local);
  };

  // Panning handlers: start on middle mouse button or Space+left-drag
  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const evt = e.evt as MouseEvent;
    const isMiddle = evt.button === 1;
    const isSpace = spacePressedRef.current && evt.button === 0;
    if (isMiddle || isSpace) {
      isPanningRef.current = true;
      const pos = stage.getPointerPosition();
      panStartRef.current = pos ? { x: pos.x, y: pos.y } : null;
      panStageStartRef.current = { x: stage.x() ?? 0, y: stage.y() ?? 0 };
      // change cursor
      stage.container().style.cursor = "grabbing";
    }
  };

  const handleStageMouseUp = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (isPanningRef.current) {
      isPanningRef.current = false;
      panStartRef.current = null;
      stage.container().style.cursor = "default";
    }
  };

  const handleStageContextMenu = (e: Konva.KonvaEventObject<MouseEvent>) => {
    // prevent browser context menu and cancel connection drawing if active
    try {
      e.evt.preventDefault();
    } catch (err) {
      void err;
    }
    if (isDrawing) {
      setIsDrawing(false);
      setDrawingFrom(null);
      setIntermediatePoints([]);
    }
  };

  useEffect(() => {
    const onDocContext = (ev: MouseEvent) => {
      try {
        ev.preventDefault();
      } catch (err) {
        void err;
      }
      if (isDrawing) {
        setIsDrawing(false);
        setDrawingFrom(null);
        setIntermediatePoints([]);
      }
    };
    document.addEventListener("contextmenu", onDocContext);
    return () => document.removeEventListener("contextmenu", onDocContext);
  }, [isDrawing]);

  const handleStageMouseMoveForPan = () => {
    const stage = stageRef.current;
    if (!stage) return;
    if (!isPanningRef.current || !panStartRef.current) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;
    const dx = pos.x - panStartRef.current.x;
    const dy = pos.y - panStartRef.current.y;
    stage.position({
      x: panStageStartRef.current.x + dx,
      y: panStageStartRef.current.y + dy,
    });
    stage.batchDraw();
    // update mousePos too (converted below in handleMove)
  };

  const handleDragMove = () => {
    setMousePos((m) => (m ? { ...m } : null));
  };

  const handleStageClick = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (e.target === e.target.getStage()) {
      setSelectedId(null);
    }
  };

  const handleRemoveConnection = (id: string) => {
    pushHistory();
    setConnections((prev) => prev.filter((c) => c.id !== id));
  };

  // Detect and snap line endpoints, then form shapes
  const formShapeFromLines = useCallback(
    (lineIds: string[], vertices: Point[]) => {
      // Calculate centroid for positioning
      const centroid = {
        x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
        y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length,
      };

      // Convert vertices to points array relative to centroid
      const points: number[] = [];
      vertices.forEach((v) => {
        points.push(v.x - centroid.x);
        points.push(v.y - centroid.y);
      });

      // const colors = ["#f66", "#6f6", "#66f", "#ff6", "#f6f", "#6ff"];
      const newShape: Shape = {
        id:
          typeof crypto !== "undefined" &&
          typeof (crypto as unknown as { randomUUID?: () => string })
            .randomUUID === "function"
            ? (crypto as unknown as { randomUUID?: () => string }).randomUUID!()
            : `shape-${Date.now()}`,
        type: "polygon",
        x: centroid.x,
        y: centroid.y,
        fill: "",
        points: points,
        rotation: 0,
        generatedFromLines: true,
        name: "Polygon " + Math.floor(Math.random() * 1000),
      };

      // Update connections
      const updatedConnections = connections.map((conn) => {
        const newConn = { ...conn };
        if (lineIds.includes(conn.from.shapeId)) {
          newConn.from = { ...conn.from, shapeId: newShape.id };
        }
        if (lineIds.includes(conn.to.shapeId)) {
          newConn.to = { ...conn.to, shapeId: newShape.id };
        }
        return newConn;
      });

      setShapes((prev) => [
        ...prev.filter((s) => !lineIds.includes(s.id)),
        newShape,
      ]);
      setConnections(updatedConnections);
    },
    [connections]
  );

  useEffect(() => {
    if (suppressAutoFormRef.current) return;

    const lineShapes = shapes.filter((s) => s.type === "line");
    if (lineShapes.length < 3) return;

    const pointKey = (p: Point) => `${Math.round(p.x)},${Math.round(p.y)}`;

    const getEndpoints = (line: Shape) => {
      const half = line.radius ?? 100;
      const rot = ((line.rotation ?? 0) * Math.PI) / 180;
      const dx = half * Math.cos(rot);
      const dy = half * Math.sin(rot);
      return {
        p1: { x: line.x - dx, y: line.y - dy },
        p2: { x: line.x + dx, y: line.y + dy },
      };
    };

    // Build endpoint map with snapping
    const endpointMap = new Map<string, { point: Point; lineIds: string[] }>();

    lineShapes.forEach((line) => {
      const { p1, p2 } = getEndpoints(line);

      [p1, p2].forEach((point) => {
        let snapped = false;

        // Check if this point snaps to an existing cluster
        for (const [, cluster] of endpointMap.entries()) {
          if (distance(point, cluster.point) < SNAP_THRESHOLD) {
            cluster.lineIds.push(line.id);
            snapped = true;
            break;
          }
        }

        if (!snapped) {
          const key = pointKey(point);
          endpointMap.set(key, { point, lineIds: [line.id] });
        }
      });
    });

    // Find clusters where 2+ lines meet (potential vertices)
    const vertices = Array.from(endpointMap.values()).filter(
      (cluster) => cluster.lineIds.length >= 2
    );

    if (vertices.length < 3) return;

    // Build adjacency graph
    const graph = new Map<string, Set<string>>();
    lineShapes.forEach((line) => {
      const { p1, p2 } = getEndpoints(line);

      let vertex1 = null,
        vertex2 = null;

      for (const v of vertices) {
        if (distance(p1, v.point) < SNAP_THRESHOLD) vertex1 = pointKey(v.point);
        if (distance(p2, v.point) < SNAP_THRESHOLD) vertex2 = pointKey(v.point);
      }

      if (vertex1 && vertex2) {
        if (!graph.has(vertex1)) graph.set(vertex1, new Set());
        if (!graph.has(vertex2)) graph.set(vertex2, new Set());
        graph.get(vertex1)!.add(vertex2);
        graph.get(vertex2)!.add(vertex1);
      }
    });

    // Find closed cycles using DFS
    const findCycle = (): string[] | null => {
      for (const startKey of graph.keys()) {
        const visited = new Set<string>();
        const path: string[] = [];

        const dfs = (current: string, parent: string | null): boolean => {
          visited.add(current);
          path.push(current);

          const neighbors = graph.get(current) || new Set();

          for (const next of neighbors) {
            if (next === parent) continue;

            if (visited.has(next) && next === startKey && path.length >= 3) {
              return true; // Found cycle back to start
            }

            if (!visited.has(next)) {
              if (dfs(next, current)) return true;
            }
          }

          path.pop();
          return false;
        };

        if (dfs(startKey, null) && path.length >= 3) {
          return path;
        }
      }
      return null;
    };

    const cycle = findCycle();

    if (cycle && cycle.length >= 3) {
      // Get the actual vertex points
      const cyclePoints = cycle.map((key) => {
        const vertex = Array.from(endpointMap.values()).find(
          (v) => pointKey(v.point) === key
        );
        return vertex!.point;
      });

      // Find which lines make up this shape
      const shapeLineIds = new Set<string>();
      lineShapes.forEach((line) => {
        const { p1, p2 } = getEndpoints(line);
        const hasP1 = cyclePoints.some(
          (cp) => distance(p1, cp) < SNAP_THRESHOLD
        );
        const hasP2 = cyclePoints.some(
          (cp) => distance(p2, cp) < SNAP_THRESHOLD
        );
        if (hasP1 && hasP2) shapeLineIds.add(line.id);
      });

      if (shapeLineIds.size >= 3) {
        pushHistory();
        formShapeFromLines(Array.from(shapeLineIds), cyclePoints);
      }
    }
  }, [shapes, formShapeFromLines, pushHistory]);

  // Properties panel handler: update name for selected shape
  const updateSelectedShapeName = (name: string) => {
    if (!selectedId) return;
    pushHistory();
    setShapes((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, name } : s))
    );
  };

  // Screenshot helpers: capture current view or full canvas
  const screenshotCurrent = () => {
    const st = stageRef.current;
    if (!st) return;
    // use toDataURL which respects current transforms and device pixel ratio
    const url = st.toDataURL({ pixelRatio: window.devicePixelRatio || 2 });
    // trigger download
    const a = document.createElement("a");
    a.href = url;
    a.download = `stage-view-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const screenshotFull = () => {
    const st = stageRef.current;
    if (!st) return;
    // Capture the full canvas (unzoomed/unpanned): temporarily reset scale & position
    const prevScale = st.scaleX() ?? 1;
    const prevPos = { x: st.x() ?? 0, y: st.y() ?? 0 };

    try {
      st.scale({ x: 1, y: 1 });
      st.position({ x: 0, y: 0 });
      st.batchDraw();

      // ensure drawing finished before capturing
      requestAnimationFrame(() => {
        const dataUrl = st.toDataURL({
          pixelRatio: window.devicePixelRatio || 2,
        });
        const a = document.createElement("a");
        a.href = dataUrl;
        a.download = `stage-full-${Date.now()}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        // restore previous transform
        st.scale({ x: prevScale, y: prevScale });
        st.position(prevPos);
        st.batchDraw();
      });
    } catch (err) {
      void err;
      // fallback: try to capture current view
      const dataUrl = st.toDataURL({
        pixelRatio: window.devicePixelRatio || 2,
      });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `stage-full-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
  };

  return (
    <div className="relative w-full">
      <Header
        onAddShape={addShape}
        onScreenshotCurrent={screenshotCurrent}
        onScreenshotFull={screenshotFull}
        stageRef={stageRef}
        onReset={resetAll}
      />
      <div className="mt-16">
        <Stage
          width={size.w}
          height={size.h - 64}
          ref={stageRef}
          onClick={handleClick}
          onMouseDown={handleStageMouseDown}
          onMouseUp={handleStageMouseUp}
          onContextMenu={handleStageContextMenu}
          onMouseMove={() => {
            // first handle panning if active
            handleStageMouseMoveForPan();
            // then update mouse position normally
            handleMove();
          }}
          onTap={handleStageClick}
          style={{ background: "#fff" }}
        >
          <Layer>
            <GridBackground width={size.w} height={size.h} />
          </Layer>
          <Layer ref={layerRef}>
            {/* Shapes */}
            {shapes.map((shape) => (
              <ShapeComponent
                key={shape.id}
                shape={shape}
                isSelected={shape.id === selectedId}
                onSelect={() => setSelectedId(shape.id)}
                onDragMove={handleDragMove}
                ref={(ref) => {
                  shapeRefs.current[shape.id] = ref ?? null;
                }}
                onDragEnd={(newProps) => {
                  pushHistory();
                  setShapes((prev) =>
                    prev.map((s) =>
                      s.id === shape.id ? { ...s, ...newProps } : s
                    )
                  );
                }}
              />
            ))}

            {selectedId &&
              shapes.find((s) => s.id === selectedId)?.type !== "line" && (
                <Transformer
                  ref={transformerRef}
                  keepRatio={false}
                  rotateEnabled={true}
                  boundBoxFunc={(oldBox, newBox) => {
                    if (newBox.width < 10) return oldBox;
                    return newBox;
                  }}
                />
              )}

            {/* Connections */}
            {connections.map((c) => (
              <ConnectionLine
                key={c.id}
                connection={c}
                layer={layerRef.current}
                stroke={STROKE}
                strokeWidth={STROKE_WIDTH}
                onRemove={handleRemoveConnection}
              />
            ))}

            {/* Drawing preview */}
            {isDrawing &&
              drawingFrom &&
              mousePos &&
              (() => {
                const layer = layerRef.current;
                if (!layer) return null;
                const from = anchorToPoint(layer, drawingFrom);
                const points: number[] = [from.x, from.y];
                intermediatePoints.forEach((pt) => {
                  points.push(pt.x, pt.y);
                });
                points.push(mousePos.x, mousePos.y);
                return (
                  <Line
                    points={points}
                    stroke={STROKE}
                    strokeWidth={STROKE_WIDTH}
                    dash={[6, 4]}
                  />
                );
              })()}
            {/* debug visual for computed 'from' anchor */}
            {(window as unknown as Record<string, unknown>).__ANCHOR_DEBUG__ &&
              isDrawing &&
              drawingFrom &&
              layerRef.current &&
              (() => {
                const p = anchorToPoint(layerRef.current, drawingFrom);
                return <KonvaCircle x={p.x} y={p.y} radius={6} fill="red" />;
              })()}
          </Layer>
        </Stage>
      </div>
      {/* Properties panel for selected shape */}
      {(() => {
        const selectedShape = selectedId
          ? shapes.find((sh) => sh.id === selectedId) ?? null
          : null;
        if (!selectedShape) return null;
        const fontSizeStyle = selectedShape.fontSize
          ? { fontSize: `${selectedShape.fontSize}px` }
          : undefined;
        return (
          <div
            style={fontSizeStyle}
            className="absolute right-4 top-20 bg-white border rounded p-3 shadow z-20 w-64"
          >
            <h3 className="font-bold text-sm mb-2">Properties</h3>
            <div className="text-sm">
              <div className="mb-2">
                <div className="text-xs text-gray-500">ID</div>
                <div className="break-words text-xs">{selectedShape.id}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Name</div>
                <input
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={selectedShape.name ?? ""}
                  onChange={(e) => updateSelectedShapeName(e.target.value)}
                />
              </div>
              <div className="mt-2">
                <div className="text-xs text-gray-500">Font size</div>
                <input
                  type="number"
                  min={0}
                  max={72}
                  className="w-full border rounded px-2 py-1 text-sm"
                  value={selectedShape.fontSize ?? 14}
                  onChange={(e) => {
                    const v = Number(e.target.value) || 14;
                    if (v < 0 || v > 72) return;
                    pushHistory();
                    setShapes((prev) =>
                      prev.map((sh) =>
                        sh.id === selectedId ? { ...sh, fontSize: v } : sh
                      )
                    );
                  }}
                />
                <div className="mt-2">
                  <div className="text-xs text-gray-500">Stroke width</div>
                  <input
                    type="number"
                    min={0}
                    max={20}
                    step={1}
                    className="w-full border rounded px-2 py-1 text-sm"
                    value={selectedShape.strokeWidth ?? 2}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      if (Number.isNaN(v)) return;
                      if (v < 0 || v > 20) return;
                      pushHistory();
                      setShapes((prev) =>
                        prev.map((sh) =>
                          sh.id === selectedId ? { ...sh, strokeWidth: v } : sh
                        )
                      );
                    }}
                  />
                </div>
              </div>
              {selectedShape.generatedFromLines && (
                <div className="mt-2 text-xs text-gray-600">
                  Generated from lines
                </div>
              )}
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default Main;
