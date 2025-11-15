import type Konva from "konva";
import type { AnchorDescriptor, Point, RectSide } from "../../../types";
import { distance, polygonVertices, projectPointToSegment } from "./helpers";

export function createAnchor(
  shape: Konva.Node,
  px: number,
  py: number
): AnchorDescriptor {
  const shapeId =
    typeof shape.id === "function"
      ? shape.id()
      : (shape as unknown as { id?: string }).id ?? "";
  const type =
    typeof shape.getClassName === "function"
      ? shape.getClassName()
      : (shape as unknown as { className?: string }).className ?? "";

  let localP: { x: number; y: number } = { x: px, y: py };
  const trRaw = (
    shape as unknown as { getAbsoluteTransform?: () => unknown }
  ).getAbsoluteTransform?.();
  if (
    trRaw &&
    typeof trRaw === "object" &&
    trRaw !== null &&
    "copy" in trRaw &&
    typeof (trRaw as { copy?: unknown }).copy === "function"
  ) {
    try {
      const tr = trRaw as {
        copy: () => { invert: () => { point?: (p: Point) => Point } };
      };
      const inv = tr.copy().invert();
      if (typeof (inv as { point?: unknown }).point === "function")
        localP = (inv as { point: (p: Point) => Point }).point({
          x: px,
          y: py,
        });
    } catch (e) {
      void e;
      localP = { x: px, y: py };
    }
  }

  if (type === "Rect") {
    const r = shape as Konva.Rect;
    const w =
      typeof r.width === "function"
        ? r.width()
        : (r as unknown as { width?: number }).width ?? 0;
    const h =
      typeof r.height === "function"
        ? r.height()
        : (r as unknown as { height?: number }).height ?? 0;

    const nx = Math.min(Math.max(localP.x, 0), w || 1);
    const ny = Math.min(Math.max(localP.y, 0), h || 1);

    const options = [
      {
        side: "top" as RectSide,
        dist: Math.abs(localP.y - 0),
        t: nx / (w || 1),
      },
      {
        side: "bottom" as RectSide,
        dist: Math.abs(localP.y - h),
        t: nx / (w || 1),
      },
      {
        side: "left" as RectSide,
        dist: Math.abs(localP.x - 0),
        t: ny / (h || 1),
      },
      {
        side: "right" as RectSide,
        dist: Math.abs(localP.x - w),
        t: ny / (h || 1),
      },
    ];
    const best = options.sort((a, b) => a.dist - b.dist)[0];
    const anchor = {
      shapeId,
      kind: "rect",
      side: best.side,
      t: best.t,
    } as AnchorDescriptor;
    if ((window as unknown as Record<string, unknown>).__ANCHOR_DEBUG__)
      console.debug("createAnchor rect", { shapeId, px, py, localP, anchor });
    return anchor;
  }

  if (type === "Circle") {
    const angle = Math.atan2(localP.y, localP.x);
    const anchor = { shapeId, kind: "circle", angle } as AnchorDescriptor;
    if ((window as unknown as Record<string, unknown>).__ANCHOR_DEBUG__)
      console.debug("createAnchor circle", { shapeId, px, py, localP, anchor });
    return anchor;
  }

  if (type === "RegularPolygon" || type === "Line") {
    const vertsStage = polygonVertices(shape);
    let best = { edgeIndex: 0, t: 0, d: Infinity };
    vertsStage.forEach((v, i) => {
      const b = vertsStage[(i + 1) % vertsStage.length];
      const { point, t } = projectPointToSegment({ x: px, y: py }, v, b);
      const d = distance(point, { x: px, y: py });
      if (d < best.d) best = { edgeIndex: i, t, d };
    });
    return { shapeId, kind: "poly", edgeIndex: best.edgeIndex, t: best.t };
  }

  throw new Error("Unsupported shape");
}

export function anchorToPoint(
  layer: Konva.Layer,
  anchor: AnchorDescriptor
): Point {
  const stage = layer.getStage?.() ?? null;
  let node: Konva.Node | null = null;
  if (stage) node = stage.findOne(`#${anchor.shapeId}`) as Konva.Node | null;
  if (!node) node = (layer.findOne(`#${anchor.shapeId}`) as Konva.Node) ?? null;
  if (!node) {
    const children = layer.getChildren();
    for (const c of children) {
      try {
        if (c.id && c.id() === anchor.shapeId) {
          node = c;
          break;
        }
      } catch (err) {
        void err;
      }
    }
  }
  if (!node) return { x: 0, y: 0 };
  const type =
    node.getClassName?.() ??
    (node as unknown as { className?: string }).className ??
    "";

  const stageToLayer = (pt: Point) => {
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
          return (inv as { point: (p: Point) => Point }).point(pt);
      } catch (err) {
        void err;
      }
    }
    return pt;
  };

  if (anchor.kind === "rect" && type === "Rect") {
    const r = node as Konva.Rect;
    const w =
      (typeof r.width === "function"
        ? r.width()
        : (r as unknown as { width?: number }).width ?? 0) *
      (typeof r.scaleX === "function"
        ? r.scaleX()
        : (r as unknown as { scaleX?: number }).scaleX ?? 1);
    const h =
      (typeof r.height === "function"
        ? r.height()
        : (r as unknown as { height?: number }).height ?? 0) *
      (typeof r.scaleY === "function"
        ? r.scaleY()
        : (r as unknown as { scaleY?: number }).scaleY ?? 1);
    let local = { x: 0, y: 0 };
    if (anchor.side === "top") local = { x: anchor.t * w, y: 0 };
    else if (anchor.side === "bottom") local = { x: anchor.t * w, y: h };
    else if (anchor.side === "left") local = { x: 0, y: anchor.t * h };
    else local = { x: w, y: anchor.t * h };
    const trRaw2 = (
      r as unknown as { getAbsoluteTransform?: () => unknown }
    ).getAbsoluteTransform?.();
    if (
      trRaw2 &&
      typeof trRaw2 === "object" &&
      trRaw2 !== null &&
      "point" in trRaw2 &&
      typeof (trRaw2 as { point?: unknown }).point === "function"
    ) {
      return stageToLayer(
        (trRaw2 as { point: (p: Point) => Point }).point(local)
      );
    }
    const x =
      (typeof r.x === "function"
        ? r.x()
        : (r as unknown as { x?: number }).x ?? 0) + local.x;
    const y =
      (typeof r.y === "function"
        ? r.y()
        : (r as unknown as { y?: number }).y ?? 0) + local.y;
    return stageToLayer({ x, y });
  }

  if (anchor.kind === "circle" && type === "Circle") {
    const c = node as Konva.Circle;
    const radiusVal =
      typeof c.radius === "function"
        ? c.radius()
        : (c as unknown as { radius?: number }).radius ?? 0;
    const scaleXVal =
      typeof c.scaleX === "function"
        ? c.scaleX()
        : (c as unknown as { scaleX?: number }).scaleX ?? 1;
    const rr = radiusVal * scaleXVal;
    const local = {
      x: rr * Math.cos(anchor.angle),
      y: rr * Math.sin(anchor.angle),
    };
    const trRaw3 = (
      c as unknown as { getAbsoluteTransform?: () => unknown }
    ).getAbsoluteTransform?.();
    if (
      trRaw3 &&
      typeof trRaw3 === "object" &&
      trRaw3 !== null &&
      "point" in trRaw3 &&
      typeof (trRaw3 as { point?: unknown }).point === "function"
    ) {
      return stageToLayer(
        (trRaw3 as { point: (p: Point) => Point }).point(local)
      );
    }
    return stageToLayer({ x: c.x() + local.x, y: c.y() + local.y });
  }

  if (
    anchor.kind === "poly" &&
    (type === "RegularPolygon" || type === "Line")
  ) {
    const poly = node as Konva.RegularPolygon | Konva.Line;
    const verts = polygonVertices(poly);
    if (verts.length < 2) return { x: 0, y: 0 };
    const a = verts[anchor.edgeIndex];
    const b = verts[(anchor.edgeIndex + 1) % verts.length];
    const stagePt = {
      x: a.x + anchor.t * (b.x - a.x),
      y: a.y + anchor.t * (b.y - a.y),
    };
    return stageToLayer(stagePt);
  }

  return { x: 0, y: 0 };
}
