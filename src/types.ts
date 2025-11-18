/* ---------- Types ---------- */
export type RectSide = "top" | "bottom" | "left" | "right";
export interface RectAnchor {
  shapeId: string;
  kind: "rect";
  side: RectSide;
  t: number;
}
export interface CircleAnchor {
  shapeId: string;
  kind: "circle";
  angle: number;
}
export interface PolyAnchor {
  shapeId: string;
  kind: "poly";
  edgeIndex: number;
  t: number;
}
export interface CustomAnchor {
  shapeId: string;
  kind: "custom";
  index: number;
}
export type AnchorDescriptor =
  | RectAnchor
  | CircleAnchor
  | PolyAnchor
  | CustomAnchor;

export interface IntermediatePoint {
  x: number;
  y: number;
}

export interface Connection {
  id: string;
  from: AnchorDescriptor;
  to: AnchorDescriptor;
  intermediatePoints: IntermediatePoint[];
}

export interface Point {
  x: number;
  y: number;
}

export interface Shape {
  id: string;
  type:
    | "rect"
    | "circle"
    | "triangle"
    | "line"
    | "polygon"
    | "ups"
    | "transformer"
    | "surge_arrester"
    | "selector_switch" // this one is a circle and doesn't have anchor points
    | "rectifier"
    | "RCBO";
  x: number;
  y: number;
  fill: string;
  // optional font size (used by the properties panel display or text rendering)
  fontSize?: number;
  // optional stroke width for the shape outline
  strokeWidth?: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number;
  points?: number[];
  // optional display name for the shape
  name?: string;
  // true if this shape was auto-created by joining lines into a polygon
  generatedFromLines?: boolean;
  // optional image URL to display inside the shape (when supported)
  image?: string | null;
  // optional explicit anchor points in the shape's local coordinate space.
  // These are used when you want connections to attach only to fixed points.
  anchorPoints?: { x: number; y: number }[];
}
