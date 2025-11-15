import type Konva from "konva";
import type { Point } from "../../../types";

export function distance(a: Point, b: Point): number {
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
  if (node.getClassName() === "Line") {
    const line = node as Konva.Line;
    const pts = line.points();
    if (!Array.isArray(pts) || pts.length < 4) return [];

    const localVerts: Point[] = [];
    for (let i = 0; i < pts.length; i += 2) {
      localVerts.push({ x: pts[i], y: pts[i + 1] });
    }

    if (opts?.local) return localVerts;

    const trRaw = (
      node as unknown as { getAbsoluteTransform?: () => unknown }
    ).getAbsoluteTransform?.();
    if (
      trRaw &&
      typeof trRaw === "object" &&
      trRaw !== null &&
      "point" in trRaw &&
      typeof (trRaw as { point?: unknown }).point === "function"
    ) {
      const tr = trRaw as { point: (p: Point) => Point };
      return localVerts.map((v: Point) => tr.point(v));
    }

    const cx =
      typeof (node as unknown as { x?: unknown }).x === "function"
        ? (node as unknown as { x: () => number }).x()
        : (node as unknown as { x?: number }).x ?? 0;
    const cy =
      typeof (node as unknown as { y?: unknown }).y === "function"
        ? (node as unknown as { y: () => number }).y()
        : (node as unknown as { y?: number }).y ?? 0;
    return localVerts.map((v: Point) => ({ x: cx + v.x, y: cy + v.y }));
  }

  const n = node as unknown as {
    sides?: number | (() => number);
    radius?: number | (() => number);
    rotation?: number | (() => number);
    attrs?: Record<string, unknown>;
    getAbsoluteTransform?: () => unknown;
    x?: number | (() => number);
    y?: number | (() => number);
  };
  const sidesRaw = n.sides ?? n.attrs?.sides;
  const sides =
    typeof sidesRaw === "function"
      ? sidesRaw.call(node)
      : Number(sidesRaw) || 0;
  const radiusRaw = n.radius ?? n.attrs?.radius;
  const radius =
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

  const trRaw2 = n.getAbsoluteTransform?.();
  if (
    trRaw2 &&
    typeof trRaw2 === "object" &&
    trRaw2 !== null &&
    "point" in trRaw2 &&
    typeof (trRaw2 as { point?: unknown }).point === "function"
  ) {
    const tr2 = trRaw2 as { point: (p: Point) => Point };
    return vertsLocal.map((v: Point) => tr2.point(v));
  }

  const cx = typeof n.x === "function" ? n.x() : n.x ?? 0;
  const cy = typeof n.y === "function" ? n.y() : n.y ?? 0;
  return vertsLocal.map((v: Point) => ({ x: cx + v.x, y: cy + v.y }));
}

export function snapDeltaTo8(dx: number, dy: number): Point {
  if (dx === 0 && dy === 0) return { x: 0, y: 0 };
  const angle = Math.atan2(dy, dx);
  const octant = Math.round(angle / (Math.PI / 4));
  const snappedAngle = octant * (Math.PI / 4);
  const len = Math.hypot(dx, dy);
  return { x: Math.cos(snappedAngle) * len, y: Math.sin(snappedAngle) * len };
}
