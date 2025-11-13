import type Konva from "konva";
import type { Point } from "../../../types";

/* ---------- Geometry helpers ---------- */
// Lightweight local interface to read properties/methods that differ
// between Konva versions or between Node subclasses.

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function projectPointToSegment(
  p: Point,
  a: Point,
  b: Point
): { point: Point; t: number } {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2;
  const tc = Math.max(0, Math.min(1, t));
  return {
    point: { x: a.x + vx * tc, y: a.y + vy * tc },
    t: tc,
  };
}

export function polygonVertices(
  node: Konva.Node,
  opts?: { local?: boolean }
): Point[] {
  if (node.getClassName() === "Line" && (node as any).closed?.() === true) {
    const line = node as Konva.Line;
    const pts = line.points();
    if (!Array.isArray(pts)) return [];

    const localVerts: Point[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      localVerts.push({ x: pts[i], y: pts[i + 1] });
    }

    if (opts?.local) return localVerts;

    const tr = (node as any).getAbsoluteTransform?.();
    if (tr && typeof tr.point === "function") {
      return localVerts.map((v: Point) => tr.point(v));
    }

    const cx =
      typeof (node as any).x === "function"
        ? (node as any).x()
        : (node as any).x ?? 0;
    const cy =
      typeof (node as any).y === "function"
        ? (node as any).y()
        : (node as any).y ?? 0;
    return localVerts.map((v: Point) => ({ x: cx + v.x, y: cy + v.y }));
  }

  if (node.getClassName() === "Line") {
    const line = node as Konva.Line;
    const pts = line.points();
    if (!Array.isArray(pts) || pts.length < 4) return [];
    const half = pts[2] / 2;
    const localVerts = [
      { x: -half, y: 0 },
      { x: half, y: 0 },
    ];
    if (opts?.local) return localVerts;
    const tr = (node as any).getAbsoluteTransform?.();
    if (tr && typeof tr.point === "function") {
      return localVerts.map((v: Point) => tr.point(v));
    }
    const cx =
      typeof (node as any).x === "function"
        ? (node as any).x()
        : (node as any).x ?? 0;
    const cy =
      typeof (node as any).y === "function"
        ? (node as any).y()
        : (node as any).y ?? 0;
    return localVerts.map((v: Point) => ({ x: cx + v.x, y: cy + v.y }));
  }

  const n = node as any;
  const sidesRaw = n.sides ?? n.attrs?.sides;
  let sides =
    typeof sidesRaw === "function"
      ? sidesRaw.call(node)
      : Number(sidesRaw) || 0;
  const radiusRaw = n.radius ?? n.attrs?.radius;
  let radius =
    typeof radiusRaw === "function"
      ? radiusRaw.call(node)
      : Number(radiusRaw) || 0;
  const rotationDeg =
    typeof n.rotation === "function" ? n.rotation() : n.rotation || 0;
  const rotation = (rotationDeg * Math.PI) / 180;
  const startAngle = -Math.PI / 2 + rotation;

  if (sides < 1) return [];

  const vertsLocal = Array.from({ length: sides }, (_, i) => {
    const angle = startAngle + (i * 2 * Math.PI) / sides;
    return { x: radius * Math.cos(angle), y: radius * Math.sin(angle) };
  });

  if (opts?.local) return vertsLocal;

  const tr = n.getAbsoluteTransform?.();
  if (tr && typeof tr.point === "function") {
    return vertsLocal.map((v: Point) => tr.point(v));
  }

  const cx = typeof n.x === "function" ? n.x() : n.x ?? 0;
  const cy = typeof n.y === "function" ? n.y() : n.y ?? 0;
  return vertsLocal.map((v: Point) => ({ x: cx + v.x, y: cy + v.y }));
}

// Helper: snap a delta to 8 cardinal/diagonal directions when shift is held
export function snapDeltaTo8(dx: number, dy: number) {
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const angle = Math.atan2(dy, dx);
  // eight directions: multiples of 45deg
  const octant = Math.round(angle / (Math.PI / 4));
  const snappedAngle = octant * (Math.PI / 4);
  const len = Math.hypot(dx, dy);
  return { x: Math.cos(snappedAngle) * len, y: Math.sin(snappedAngle) * len };
}
