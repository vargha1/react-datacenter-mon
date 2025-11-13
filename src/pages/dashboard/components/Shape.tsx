import React from "react";
import { Circle, Line, Rect, RegularPolygon } from "react-konva";
import type { Point, Shape } from "../../../types";
import type Konva from "konva";
import { snapDeltaTo8 } from "../utils/helpers";

export const ShapeComponent = React.forwardRef<
  Konva.Node | null,
  {
    shape: Shape;
    isSelected: boolean;
    onSelect: () => void;
    onDragMove: () => void;
    onDragEnd?: (newProps: Partial<Shape>) => void;
  }
>(({ shape, onSelect, onDragMove, onDragEnd }, ref) => {
  const commonProps = {
    id: shape.id,
    x: shape.x,
    y: shape.y,
    draggable: true,
    onClick: onSelect,
    onTap: onSelect,
    onDragMove,
    rotation: shape.rotation ?? 0,
    perfectDrawEnabled: false,
  } as const;

  if (shape.type === "rect") {
    return (
      <Rect
        {...commonProps}
        ref={ref as React.RefObject<Konva.Rect>}
        width={shape.width ?? 120}
        height={shape.height ?? 80}
        fill={shape.fill}
        onDragMove={(e) => {
          const evt = (e.evt as MouseEvent) ?? null;
          if (evt?.shiftKey) {
            const node = e.target as Konva.Rect;
            const start = { x: shape.x, y: shape.y };
            const dx = node.x() - start.x;
            const dy = node.y() - start.y;
            const snapped = snapDeltaTo8(dx, dy);
            node.position({ x: start.x + snapped.x, y: start.y + snapped.y });
          }
          onDragMove();
        }}
        onDragEnd={(e) => {
          const node = e.target as Konva.Rect;
          onDragEnd?.({ x: node.x(), y: node.y() });
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Rect;
          const newW = (node.width() ?? 0) * (node.scaleX() ?? 1);
          const newH = (node.height() ?? 0) * (node.scaleY() ?? 1);
          node.scaleX(1);
          node.scaleY(1);
          onDragEnd?.({ x: node.x(), y: node.y(), width: newW, height: newH });
        }}
      />
    );
  }

  if (shape.type === "circle") {
    return (
      <Circle
        {...commonProps}
        ref={ref as React.RefObject<Konva.Circle>}
        radius={shape.radius ?? 50}
        fill={shape.fill}
        onDragMove={(e) => {
          const evt = (e.evt as MouseEvent) ?? null;
          if (evt?.shiftKey) {
            const node = e.target as Konva.Circle;
            const start = { x: shape.x, y: shape.y };
            const dx = node.x() - start.x;
            const dy = node.y() - start.y;
            const snapped = snapDeltaTo8(dx, dy);
            node.position({ x: start.x + snapped.x, y: start.y + snapped.y });
          }
          onDragMove();
        }}
        onDragEnd={(e) => {
          const node = e.target as Konva.Circle;
          onDragEnd?.({ x: node.x(), y: node.y() });
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Circle;
          const newR = (node.radius() ?? 0) * (node.scaleX() ?? 1);
          node.scaleX(1);
          node.scaleY(1);
          onDragEnd?.({
            x: node.x(),
            y: node.y(),
            radius: newR,
            rotation: node.rotation(),
          });
        }}
      />
    );
  }

  if (shape.type === "triangle") {
    return (
      <RegularPolygon
        {...commonProps}
        ref={ref as React.RefObject<Konva.RegularPolygon>}
        sides={3}
        radius={shape.radius ?? 70}
        fill={shape.fill}
        stroke={shape.fill}
        strokeWidth={2}
        onDragMove={(e) => {
          const evt = (e.evt as MouseEvent) ?? null;
          if (evt?.shiftKey) {
            const node = e.target as Konva.RegularPolygon;
            const start = { x: shape.x, y: shape.y };
            const dx = node.x() - start.x;
            const dy = node.y() - start.y;
            const snapped = snapDeltaTo8(dx, dy);
            node.position({ x: start.x + snapped.x, y: start.y + snapped.y });
          }
          onDragMove();
        }}
        onDragEnd={(e) => {
          const node = e.target as Konva.RegularPolygon;
          onDragEnd?.({ x: node.x(), y: node.y() });
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.RegularPolygon;
          const newR = (node.radius() ?? 0) * (node.scaleX() ?? 1);
          node.scaleX(1);
          node.scaleY(1);
          onDragEnd?.({
            x: node.x(),
            y: node.y(),
            radius: newR,
            rotation: node.rotation(),
          });
        }}
      />
    );
  }

  if (shape.type === "polygon") {
    return (
      <Line
        {...commonProps}
        ref={ref as React.RefObject<Konva.Line>}
        points={shape.points}
        closed={true}
        fill={shape.fill}
        stroke={shape.fill}
        strokeWidth={2}
        onDragMove={(e) => {
          const evt = (e.evt as MouseEvent) ?? null;
          if (evt?.shiftKey) {
            const node = e.target as Konva.Line;
            const start = { x: shape.x, y: shape.y };
            const dx = node.x() - start.x;
            const dy = node.y() - start.y;
            const snapped = snapDeltaTo8(dx, dy);
            node.position({ x: start.x + snapped.x, y: start.y + snapped.y });
          }
          onDragMove();
        }}
        onDragEnd={(e) => {
          const node = e.target as Konva.Line;
          onDragEnd?.({ x: node.x(), y: node.y() });
        }}
        onTransformEnd={(e) => {
          const node = e.target as Konva.Line;
          const scaleX = node.scaleX() ?? 1;
          const scaleY = node.scaleY() ?? 1;

          // Scale the points
          const oldPoints = shape.points || [];
          const newPoints = oldPoints.map((p, i) =>
            i % 2 === 0 ? p * scaleX : p * scaleY
          );

          node.scaleX(1);
          node.scaleY(1);
          onDragEnd?.({
            x: node.x(),
            y: node.y(),
            points: newPoints,
            rotation: node.rotation(),
          });
        }}
      />
    );
  }

  if (shape.type === "line") {
    const half = shape.radius ?? 100;
    const cx = shape.x;
    const cy = shape.y;
    const rot = ((shape.rotation ?? 0) * Math.PI) / 180;
    const dx = half * Math.cos(rot);
    const dy = half * Math.sin(rot);
    const p1 = { x: cx - dx, y: cy - dy };
    const p2 = { x: cx + dx, y: cy + dy };

    const updateShape = (newP1: Point, newP2: Point) => {
      const newCx = (newP1.x + newP2.x) / 2;
      const newCy = (newP1.y + newP2.y) / 2;
      const newDx = newP2.x - newP1.x;
      const newDy = newP2.y - newP1.y;
      const newHalf = Math.hypot(newDx, newDy) / 2;
      const newRotDeg = (Math.atan2(newDy, newDx) * 180) / Math.PI;
      onDragEnd?.({ x: newCx, y: newCy, radius: newHalf, rotation: newRotDeg });
    };

    return (
      <>
        <Line
          id={shape.id}
          points={[p1.x, p1.y, p2.x, p2.y]}
          stroke={shape.fill}
          strokeWidth={4}
          lineCap="round"
          hitStrokeWidth={12}
          perfectDrawEnabled={false}
          ref={ref as React.RefObject<Konva.Line>}
          draggable
          onDragMove={(e) => {
            const evt = (e.evt as MouseEvent) ?? null;
            if (evt?.shiftKey) {
              const node = e.target as Konva.Line;
              const dx = node.x();
              const dy = node.y();
              const snapped = snapDeltaTo8(dx, dy);
              node.position({ x: snapped.x, y: snapped.y });
            }
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Line;
            const delta = { x: node.x(), y: node.y() };
            const newP1 = { x: p1.x + delta.x, y: p1.y + delta.y };
            const newP2 = { x: p2.x + delta.x, y: p2.y + delta.y };
            node.position({ x: 0, y: 0 });
            updateShape(newP1, newP2);
          }}
          onClick={onSelect}
          onTap={onSelect}
        />
        <Circle
          x={p1.x}
          y={p1.y}
          radius={8}
          fill={shape.fill}
          opacity={0.8}
          draggable
          hitStrokeWidth={20}
          onDragMove={(e) => {
            const evt = (e.evt as MouseEvent) ?? null;
            if (evt?.shiftKey) {
              const node = e.target as Konva.Circle;
              const dx = node.x() - p1.x;
              const dy = node.y() - p1.y;
              const snapped = snapDeltaTo8(dx, dy);
              node.position({ x: p1.x + snapped.x, y: p1.y + snapped.y });
            }
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Circle;
            const newPos = { x: node.x(), y: node.y() };
            updateShape(newPos, p2);
          }}
        />
        <Circle
          x={p2.x}
          y={p2.y}
          radius={8}
          fill={shape.fill}
          opacity={0.8}
          draggable
          hitStrokeWidth={20}
          onDragMove={(e) => {
            const evt = (e.evt as MouseEvent) ?? null;
            if (evt?.shiftKey) {
              const node = e.target as Konva.Circle;
              const dx = node.x() - p2.x;
              const dy = node.y() - p2.y;
              const snapped = snapDeltaTo8(dx, dy);
              node.position({ x: p2.x + snapped.x, y: p2.y + snapped.y });
            }
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Circle;
            const newPos = { x: node.x(), y: node.y() };
            updateShape(p1, newPos);
          }}
        />
      </>
    );
  }

  return null;
});
