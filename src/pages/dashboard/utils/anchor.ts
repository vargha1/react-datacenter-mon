import type Konva from "konva";
import type { AnchorDescriptor, Point, RectSide } from "../../../types";
import { distance, polygonVertices, projectPointToSegment } from "./helpers";

/* ---------- Anchor utils ---------- */
export function createAnchor(
  shape: Konva.Node,
  px: number,
  py: number
): AnchorDescriptor {
  const shapeId =
    typeof shape.id === "function" ? shape.id() : (shape as any).id ?? "";
  const type =
    typeof shape.getClassName === "function"
      ? shape.getClassName()
      : (shape as any).className ?? "";

  // Convert stage coordinates into node-local coordinates using the inverse of absolute transform
  let localP: { x: number; y: number } = { x: px, y: py };
  const tr = (shape as any).getAbsoluteTransform?.();
  if (tr && typeof tr.copy === "function") {
    try {
      const inv = tr.copy().invert();
      if (typeof inv.point === "function") localP = inv.point({ x: px, y: py });
    } catch (e) {
      // fallback to using stage coords if invert fails
      localP = { x: px, y: py };
    }
  }

  if (type === "Rect") {
    const r = shape as Konva.Rect;
    const w = typeof r.width === "function" ? r.width() : (r as any).width ?? 0;
    const h =
      typeof r.height === "function" ? r.height() : (r as any).height ?? 0;

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
    // debug
    if ((window as any).__ANCHOR_DEBUG__)
      console.debug("createAnchor rect", { shapeId, px, py, localP, anchor });
    return anchor;
  }

  if (type === "Circle") {
    // localP is measured relative to the circle's local origin
    const angle = Math.atan2(localP.y, localP.x);
    const anchor = { shapeId, kind: "circle", angle } as AnchorDescriptor;
    if ((window as any).__ANCHOR_DEBUG__)
      console.debug("createAnchor circle", { shapeId, px, py, localP, anchor });
    return anchor;
  }

 if (type === "RegularPolygon" || type === "Line") {
   const vertsLocal = polygonVertices(shape, { local: true });
   let best = { edgeIndex: 0, t: 0, d: Infinity };
   vertsLocal.forEach((v, i) => {
     const b = vertsLocal[(i + 1) % vertsLocal.length];
     const { point, t } = projectPointToSegment(localP, v, b);
     const d = distance(point, localP);
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
      } catch (e) {}
    }
  }
  if (!node) return { x: 0, y: 0 };
  const type = node.getClassName?.() ?? (node as any).className ?? "";

  const stageToLayer = (pt: Point) => {
    const layerTr = (layer as any).getAbsoluteTransform?.();
    if (layerTr && typeof layerTr.copy === "function") {
      try {
        const inv = layerTr.copy().invert();
        if (typeof inv.point === "function") return inv.point(pt);
      } catch (e) {}
    }
    return pt;
  };

  if (anchor.kind === "rect" && type === "Rect") {
    const r = node as Konva.Rect;
    const w =
      (typeof r.width === "function" ? r.width() : (r as any).width ?? 0) *
      (typeof r.scaleX === "function" ? r.scaleX() : (r as any).scaleX ?? 1);
    const h =
      (typeof r.height === "function" ? r.height() : (r as any).height ?? 0) *
      (typeof r.scaleY === "function" ? r.scaleY() : (r as any).scaleY ?? 1);
    let local = { x: 0, y: 0 };
    if (anchor.side === "top") local = { x: anchor.t * w, y: 0 };
    else if (anchor.side === "bottom") local = { x: anchor.t * w, y: h };
    else if (anchor.side === "left") local = { x: 0, y: anchor.t * h };
    else local = { x: w, y: anchor.t * h };
    const tr = (r as any).getAbsoluteTransform?.();
    if (tr && typeof tr.point === "function")
      return stageToLayer(tr.point(local));
    const x = (typeof r.x === "function" ? r.x() : (r as any).x ?? 0) + local.x;
    const y = (typeof r.y === "function" ? r.y() : (r as any).y ?? 0) + local.y;
    return stageToLayer({ x, y });
  }

  if (anchor.kind === "circle" && type === "Circle") {
    const c = node as Konva.Circle;
    const rr =
      (typeof c.radius === "function" ? c.radius() : (c as any).radius ?? 0) *
      (typeof c.scaleX === "function" ? c.scaleX() : (c as any).scaleX ?? 1);
    const local = {
      x: rr * Math.cos(anchor.angle),
      y: rr * Math.sin(anchor.angle),
    };
    const tr = (c as any).getAbsoluteTransform?.();
    if (tr && typeof tr.point === "function")
      return stageToLayer(tr.point(local));
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
