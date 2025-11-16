import { useCallback, useEffect, useRef, useState } from "react";
import { Stage, Layer, Line, Transformer } from "react-konva";
import Konva from "konva";
import type {
  AnchorDescriptor,
  Connection,
  IntermediatePoint,
  Point,
  Shape,
} from "../../types";
import { GridBackground } from "./components/Grid";
import { anchorToPoint, createAnchor } from "./utils/anchor";
import { CanvasHeader } from "./components/CanvasHeader";
import { ShapeComponent } from "./components/Shape";
import { ConnectionLine } from "./components/Connection";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { Circle as KonvaCircle } from "react-konva";
import { distance, snapDeltaTo8 } from "./utils/helpers";

const STROKE = "#222";
const STROKE_WIDTH = 2;
const CLAMP_MARGIN = 12;
const SNAP_THRESHOLD = 15;
const STORAGE_KEY = "circuit-designer-state";

export default function DashboardPage() {
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingFrom, setDrawingFrom] = useState<AnchorDescriptor | null>(null);
  const [intermediatePoints, setIntermediatePoints] = useState<
    IntermediatePoint[]
  >([]);
  const [mousePos, setMousePos] = useState<Point | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const suppressAutoFormRef = useRef(false);
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
    if (historyRef.current.length > 100) historyRef.current.shift();
    futureRef.current = [];
  }, [shapes, connections]);

  // Load persisted state
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

  // Save state

  // extract stage position/scale into stable values for the dependency array
  const _stageScaleX = stageRef.current?.scaleX?.();
  const _stageX = stageRef.current?.x?.();
  const _stageY = stageRef.current?.y?.();

  useEffect(() => {
    let t: number | null = null;
    const save = () => {
      try {
        const st = stageRef.current;
        if (st?.scaleX() || st?.x() || st?.y()) {
          const stage = st
            ? { x: st.x() ?? 0, y: st.y() ?? 0, scale: st.scaleX() ?? 1 }
            : undefined;
          const payload = JSON.stringify({ shapes, connections, stage });
          localStorage.setItem(STORAGE_KEY, payload);
        }
      } catch (err) {
        void err;
      }
    };
    t = window.setTimeout(save, 200);
    return () => {
      if (t) window.clearTimeout(t);
    };
  }, [shapes, connections, _stageScaleX, _stageX, _stageY]);

  const resetAll = useCallback(() => {
    pushHistory();
    historyRef.current = [];
    futureRef.current = [];

    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      void err;
    }

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

  // Window resize
  useEffect(() => {
    const onResize = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight - 108 });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // Transformer setup
  useEffect(() => {
    if (selectedId && transformerRef.current) {
      const node = shapeRefs.current[selectedId] as Konva.Node | undefined;
      if (node && transformerRef.current) {
        transformerRef.current.nodes([node]);
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

  // Keyboard handlers
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Delete") {
        if (selectedId) {
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
      if (e.key === "Escape") {
        if (isDrawing) {
          setIsDrawing(false);
          setDrawingFrom(null);
          setIntermediatePoints([]);
        }
      }
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
      if (e.key === "Shift") shiftPressedRef.current = false;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space") spacePressedRef.current = true;
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

  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    st.scale({ x: scale, y: scale });
    st.batchDraw();
  }, [scale]);

  // Wheel zoom
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
        st.scale({ x: newScale, y: newScale });
        st.position(newPos);
        st.batchDraw();
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

  // Drag and drop
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
      const nid =
        typeof node.id === "function"
          ? node.id()
          : (node as unknown as { id?: string }).id;
      if (!nid) continue;
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
    const layer = layerRef.current;
    let local = { x: pos.x, y: pos.y };

    if (!isDrawing) {
      if (!selectedId || !nearest || nearest.id() !== selectedId) {
        if (!nearest) setSelectedId(null);
        return;
      }
      const anchor = createAnchor(nearest, pos.x, pos.y);
      setDrawingFrom(anchor);
      setIsDrawing(true);
      setIntermediatePoints([]);
    } else {
      if (nearest && drawingFrom && nearest.id() !== drawingFrom.shapeId) {
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
        pushHistory();
      }
    }

    let lastPoint = null as Point | null;
    if (intermediatePoints.length > 0) {
      lastPoint = intermediatePoints[intermediatePoints.length - 1];
    } else {
      if (layer) lastPoint = anchorToPoint(layer, drawingFrom!);
    }
    if (lastPoint) {
      const dx = local.x - lastPoint.x;
      const dy = local.y - lastPoint.y;
      const snapped = snapDeltaTo8(dx, dy);
      local = { x: lastPoint.x + snapped.x, y: lastPoint.y + snapped.y };
    }
    setIntermediatePoints((prev) => [...prev, { x: local.x, y: local.y }]);
  };

  const handleMove = () => {
    const stage = stageRef.current;
    if (!stage) return;
    const p = stage.getPointerPosition();
    if (!p) return;
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
    if (isDrawing && drawingFrom && shiftPressedRef.current) {
      try {
        let lastPoint = null as Point | null;
        if (intermediatePoints.length > 0) {
          lastPoint = intermediatePoints[intermediatePoints.length - 1];
        } else {
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

  const formShapeFromLines = useCallback(
    (lineIds: string[], vertices: Point[]) => {
      const centroid = {
        x: vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length,
        y: vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length,
      };

      const points: number[] = [];
      vertices.forEach((v) => {
        points.push(v.x - centroid.x);
        points.push(v.y - centroid.y);
      });

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

  // Auto-form polygons from lines
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

    const endpointMap = new Map<string, { point: Point; lineIds: string[] }>();

    lineShapes.forEach((line) => {
      const { p1, p2 } = getEndpoints(line);

      [p1, p2].forEach((point) => {
        let snapped = false;

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

    const vertices = Array.from(endpointMap.values()).filter(
      (cluster) => cluster.lineIds.length >= 2
    );

    if (vertices.length < 3) return;

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
              return true;
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
      const cyclePoints = cycle.map((key) => {
        const vertex = Array.from(endpointMap.values()).find(
          (v) => pointKey(v.point) === key
        );
        return vertex!.point;
      });

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

  const updateSelectedShapeName = (name: string) => {
    if (!selectedId) return;
    pushHistory();
    setShapes((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, name } : s))
    );
  };

  const updateSelectedShapeFontSize = (fontSize: number) => {
    if (!selectedId) return;
    pushHistory();
    setShapes((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, fontSize } : s))
    );
  };

  const updateSelectedShapeStrokeWidth = (strokeWidth: number) => {
    if (!selectedId) return;
    pushHistory();
    setShapes((prev) =>
      prev.map((s) => (s.id === selectedId ? { ...s, strokeWidth } : s))
    );
  };

  const screenshotCurrent = () => {
    const st = stageRef.current;
    if (!st) return;
    const url = st.toDataURL({ pixelRatio: window.devicePixelRatio || 2 });
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
    const prevScale = st.scaleX() ?? 1;
    const prevPos = { x: st.x() ?? 0, y: st.y() ?? 0 };

    try {
      st.scale({ x: 1, y: 1 });
      st.position({ x: 0, y: 0 });
      st.batchDraw();

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

        st.scale({ x: prevScale, y: prevScale });
        st.position(prevPos);
        st.batchDraw();
      });
    } catch (err) {
      void err;
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

  const selectedShape = selectedId
    ? shapes.find((sh) => sh.id === selectedId) ?? null
    : null;

  return (
    <div className="relative w-full">
      <CanvasHeader
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
            handleStageMouseMoveForPan();
            handleMove();
          }}
          onTap={handleStageClick}
          style={{ background: "#fff" }}
        >
          <Layer>
            <GridBackground width={size.w} height={size.h} />
          </Layer>
          <Layer ref={layerRef}>
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
      {selectedShape && (
        <PropertiesPanel
          shape={selectedShape}
          onNameChange={updateSelectedShapeName}
          onFontSizeChange={updateSelectedShapeFontSize}
          onStrokeWidthChange={updateSelectedShapeStrokeWidth}
        />
      )}
    </div>
  );
}
