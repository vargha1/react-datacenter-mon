import React from "react";
import { Circle, Line, Rect, RegularPolygon, Text } from "react-konva";
import type { Point, Shape } from "../../../types";
import type Konva from "konva";
import { snapDeltaTo8 } from "../utils/helpers";

// Helper hook to load image from URL into an HTMLImageElement
function useLoadedImage(src?: string | null) {
  const [img, setImg] = React.useState<HTMLImageElement | null>(null);

  React.useEffect(() => {
    if (!src) {
      setImg(null);
      return;
    }

    let cancelled = false;
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = src;
    image.onload = () => {
      if (!cancelled) setImg(image);
    };
    image.onerror = () => {
      if (!cancelled) setImg(null);
    };

    return () => {
      cancelled = true;
    };
  }, [src]);

  return img;
}

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

  // default public image to use when a shape has no image set
  const defaultImagePath =
    "/images/ChatGPT-Image-Oct-16--2025--05_49_03-PM.png";
  const loadedImage = useLoadedImage(defaultImagePath);

  // compute sensible render dimensions from the loaded image when shape has no explicit size
  const MAX_DIM = 200; // maximum dimension to avoid huge shapes
  const imgNaturalW = loadedImage ? Math.max(1, loadedImage.width) : 0;
  const imgNaturalH = loadedImage ? Math.max(1, loadedImage.height) : 0;
  const imgScaleToMax =
    loadedImage && Math.max(imgNaturalW, imgNaturalH) > MAX_DIM
      ? MAX_DIM / Math.max(imgNaturalW, imgNaturalH)
      : 1;
  const nativeW = loadedImage ? Math.round(imgNaturalW * imgScaleToMax) : 0;
  const nativeH = loadedImage ? Math.round(imgNaturalH * imgScaleToMax) : 0;

  // Render sizes (used for rect/circle). Use explicit shape props when provided,
  // otherwise derive from image while preserving aspect ratio.
  const imgAspect = imgNaturalW && imgNaturalH ? imgNaturalW / imgNaturalH : 1;

  let renderWidth: number | undefined;
  let renderHeight: number | undefined;
  let renderRadius: number | undefined;

  if (shape.type === "rect") {
    // Priority: both width & height -> use as-is (user override)
    // next: single provided dimension -> derive the other using image aspect ratio
    // otherwise use native image size (scaled) preserving aspect ratio
    if (typeof shape.width === "number" && typeof shape.height === "number") {
      renderWidth = shape.width;
      renderHeight = shape.height;
    } else if (typeof shape.width === "number") {
      renderWidth = shape.width;
      renderHeight = Math.max(1, Math.round(renderWidth / imgAspect));
    } else if (typeof shape.height === "number") {
      renderHeight = shape.height;
      renderWidth = Math.max(1, Math.round(renderHeight * imgAspect));
    } else {
      renderWidth = nativeW || 120;
      renderHeight =
        nativeH || Math.max(1, Math.round(renderWidth / imgAspect));
    }
  }

  if (shape.type === "circle") {
    if (typeof shape.radius === "number") {
      renderRadius = shape.radius;
    } else if (nativeW || nativeH) {
      renderRadius = Math.round(Math.max(nativeW, nativeH) / 2) || 50;
    } else {
      renderRadius = 50;
    }
  }

  // Compute pattern scale and position so the image is contained and centered in the shape
  const computePatternProps = React.useCallback(() => {
    if (!loadedImage) return null;

    let w = 0;
    let h = 0;
    // top-left offset of the shape relative to node origin
    let topLeftX = 0;
    let topLeftY = 0;

    if (shape.type === "rect") {
      w = renderWidth ?? 120;
      h = renderHeight ?? 80;
      topLeftX = 0;
      topLeftY = 0;
    } else if (shape.type === "circle") {
      const r = shape.radius ?? renderRadius ?? 50;
      w = r * 2;
      h = r * 2;
      // Circle node origin is center, so top-left is -r
      topLeftX = -r;
      topLeftY = -r;
    } else if (shape.type === "triangle" || shape.type === "polygon") {
      if (shape.type === "triangle") {
        const r = shape.radius ?? 70;
        w = r * 2;
        h = r * 2;
        topLeftX = -r;
        topLeftY = -r;
      } else {
        const pts = shape.points || [];
        if (pts.length >= 2) {
          let minX = Infinity,
            minY = Infinity,
            maxX = -Infinity,
            maxY = -Infinity;
          for (let i = 0; i < pts.length; i += 2) {
            const px = pts[i] ?? 0;
            const py = pts[i + 1] ?? 0;
            if (px < minX) minX = px;
            if (py < minY) minY = py;
            if (px > maxX) maxX = px;
            if (py > maxY) maxY = py;
          }
          if (minX === Infinity) {
            minX = 0;
            minY = 0;
            maxX = 0;
            maxY = 0;
          }
          topLeftX = minX;
          topLeftY = minY;
          w = maxX - minX;
          h = maxY - minY;
        }
      }
    }

    if (w <= 0 || h <= 0) return null;

    const imgW = Math.max(1, loadedImage.width);
    const imgH = Math.max(1, loadedImage.height);
    const scale = Math.min(w / imgW, h / imgH);

    // pattern position (so image is centered inside the shape)
    const patternX = topLeftX + (w - imgW * scale) / 2;
    const patternY = topLeftY + (h - imgH * scale) / 2;

    return {
      fillPatternScale: { x: scale, y: scale },
      fillPatternX: patternX,
      fillPatternY: patternY,
      fillPatternRepeat: "no-repeat" as const,
    };
  }, [loadedImage, shape, renderHeight, renderRadius, renderWidth]);

  const patternProps = computePatternProps();

  // Auto-resize shape to image-derived dimensions once when image loads
  const autoSizedRef = React.useRef(false);
  React.useEffect(() => {
    if (!loadedImage) return;
    if (autoSizedRef.current) return;

    const newProps: Partial<Shape> = {};
    if (shape.type === "rect") {
      if (typeof shape.width !== "number" && typeof renderWidth === "number") {
        newProps.width = renderWidth;
      }
      if (
        typeof shape.height !== "number" &&
        typeof renderHeight === "number"
      ) {
        newProps.height = renderHeight;
      }
    }
    if (shape.type === "circle") {
      if (
        typeof shape.radius !== "number" &&
        typeof renderRadius === "number"
      ) {
        newProps.radius = renderRadius;
      }
    }

    if (Object.keys(newProps).length > 0) {
      try {
        onDragEnd?.(newProps);
        autoSizedRef.current = true;
      } catch (err) {
        void err;
      }
    }
  }, [loadedImage, renderWidth, renderHeight, renderRadius, shape, onDragEnd]);

  // Precompute line endpoints and drag state at top-level so hooks are called unconditionally
  const _half = shape.radius ?? 100;
  const _rot = ((shape.rotation ?? 0) * Math.PI) / 180;
  const _dx = _half * Math.cos(_rot);
  const _dy = _half * Math.sin(_rot);
  const initialP1 = { x: (shape.x ?? 0) - _dx, y: (shape.y ?? 0) - _dy };
  const initialP2 = { x: (shape.x ?? 0) + _dx, y: (shape.y ?? 0) + _dy };

  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    draggedP1: Point;
    draggedP2: Point;
  }>({
    isDragging: false,
    draggedP1: initialP1,
    draggedP2: initialP2,
  });

  if (shape.type === "rect") {
    return (
      <>
        <Rect
          {...commonProps}
          ref={ref as React.RefObject<Konva.Rect>}
          width={renderWidth ?? 120}
          height={renderHeight ?? 80}
          // use image as pattern when available, otherwise use fill
          fillPatternImage={loadedImage ?? undefined}
          fillPatternRepeat={patternProps?.fillPatternRepeat}
          fillPatternScale={patternProps?.fillPatternScale}
          fillPatternX={patternProps?.fillPatternX}
          fillPatternY={patternProps?.fillPatternY}
          fill={loadedImage ? undefined : shape.fill}
          strokeEnabled={true}
          stroke="#000"
          strokeWidth={shape.strokeWidth ?? 2}
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
            const baseW = node.width() ?? 0;
            const baseH = node.height() ?? 0;
            const scaleX = node.scaleX() ?? 1;
            const scaleY = node.scaleY() ?? 1;
            const newW = baseW * scaleX;
            const newH = baseH * scaleY;
            node.scaleX(1);
            node.scaleY(1);

            // If an image is available, try to preserve its aspect ratio when persisting size
            if (loadedImage && loadedImage.width && loadedImage.height) {
              const aspect =
                (loadedImage.width || 1) / (loadedImage.height || 1);
              const prevW = shape.width ?? baseW;
              const prevH = shape.height ?? baseH;
              const ratioW = Math.abs(newW - prevW) / (prevW || 1);
              const ratioH = Math.abs(newH - prevH) / (prevH || 1);

              let finalW = newW;
              let finalH = newH;
              if (ratioW >= ratioH) {
                finalH = Math.max(1, Math.round(finalW / aspect));
              } else {
                finalW = Math.max(1, Math.round(finalH * aspect));
              }

              onDragEnd?.({
                x: node.x(),
                y: node.y(),
                width: finalW,
                height: finalH,
              });
            } else {
              onDragEnd?.({
                x: node.x(),
                y: node.y(),
                width: newW,
                height: newH,
              });
            }
          }}
        />

        {/* center label in rect: Rect x/y is top-left so compute center */}
        <Text
          x={(shape.x ?? 0) + (renderWidth ?? 120) / 2}
          y={(shape.y ?? 0) + (renderHeight ?? 80) / 2}
          text={shape.name ?? (shape.id ? shape.id.slice(0, 6) : "")}
          fontSize={shape.fontSize ?? 12}
          fill="#111"
          ref={(node) => {
            if (node) {
              try {
                const w = node.width() ?? 0;
                const h = node.height() ?? 0;
                node.offsetX(w / 2);
                node.offsetY(h / 2);
              } catch (err) {
                void err;
              }
            }
          }}
        />
      </>
    );
  }

  if (shape.type === "circle") {
    return (
      <>
        <Circle
          {...commonProps}
          ref={ref as React.RefObject<Konva.Circle>}
          radius={renderRadius ?? 50}
          // use contain-scaling and center the image for circle as well
          fillPatternImage={loadedImage ?? undefined}
          fillPatternRepeat={patternProps?.fillPatternRepeat}
          fillPatternScale={patternProps?.fillPatternScale}
          fillPatternX={patternProps?.fillPatternX}
          fillPatternY={patternProps?.fillPatternY}
          fill={loadedImage ? undefined : shape.fill}
          strokeEnabled={true}
          stroke="#000"
          strokeWidth={shape.strokeWidth ?? 2}
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
        <Text
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          text={shape.name ?? (shape.id ? shape.id.slice(0, 6) : "")}
          fontSize={shape.fontSize ?? 12}
          fill="#111"
          ref={(node) => {
            if (node) {
              try {
                const w = node.width() ?? 0;
                const h = node.height() ?? 0;
                node.offsetX(w / 2);
                node.offsetY(h / 2);
              } catch (err) {
                void err;
              }
            }
          }}
        />
      </>
    );
  }

  if (shape.type === "triangle") {
    return (
      <>
        <RegularPolygon
          {...commonProps}
          ref={ref as React.RefObject<Konva.RegularPolygon>}
          sides={3}
          radius={shape.radius ?? 70}
          // triangular polygons do not receive a clean image mask easily — fall back to fill when no image
          fill={shape.image ? shape.fill : shape.fill}
          strokeEnabled={true}
          stroke="#000"
          strokeWidth={shape.strokeWidth ?? 2}
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
        <Text
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          text={shape.name ?? (shape.id ? shape.id.slice(0, 6) : "")}
          fontSize={shape.fontSize ?? 12}
          fill="#111"
          ref={(node) => {
            if (node) {
              try {
                const w = node.width() ?? 0;
                const h = node.height() ?? 0;
                node.offsetX(w / 2);
                node.offsetY(h / 2);
              } catch (err) {
                void err;
              }
            }
          }}
        />
      </>
    );
  }

  if (shape.type === "polygon") {
    return (
      <>
        <Line
          {...commonProps}
          ref={ref as React.RefObject<Konva.Line>}
          points={shape.points}
          closed={true}
          // polygons: attempt to use contain-scaled pattern fill if image available, otherwise color
          fillPatternImage={loadedImage ?? undefined}
          fillPatternRepeat={patternProps?.fillPatternRepeat}
          fillPatternScale={patternProps?.fillPatternScale}
          fillPatternX={patternProps?.fillPatternX}
          fillPatternY={patternProps?.fillPatternY}
          fill={loadedImage ? undefined : shape.fill}
          strokeEnabled={true}
          stroke="#000"
          strokeWidth={shape.strokeWidth ?? 2}
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
        <Text
          x={shape.x ?? 0}
          y={shape.y ?? 0}
          text={shape.name ?? (shape.id ? shape.id.slice(0, 6) : "")}
          fontSize={shape.fontSize ?? 12}
          fill="#111"
          ref={(node) => {
            if (node) {
              try {
                const w = node.width() ?? 0;
                const h = node.height() ?? 0;
                node.offsetX(w / 2);
                node.offsetY(h / 2);
              } catch (err) {
                void err;
              }
            }
          }}
        />
      </>
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

    // use top-level dragState computed earlier
    const currentP1 = dragState.isDragging ? dragState.draggedP1 : p1;
    const currentP2 = dragState.isDragging ? dragState.draggedP2 : p2;

    const updateShapeState = (newP1: Point, newP2: Point) => {
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
          points={[currentP1.x, currentP1.y, currentP2.x, currentP2.y]}
          stroke={"#000"}
          strokeWidth={shape.strokeWidth ?? 4}
          lineCap="round"
          perfectDrawEnabled={false}
          listening={false}
        />

        {/* Invisible draggable hit area for the line */}
        <Line
          points={[currentP1.x, currentP1.y, currentP2.x, currentP2.y]}
          stroke="transparent"
          strokeWidth={12}
          lineCap="round"
          hitStrokeWidth={20}
          perfectDrawEnabled={false}
          draggable
          onDragStart={() => {
            setDragState({
              isDragging: true,
              draggedP1: p1,
              draggedP2: p2,
            });
          }}
          onDragMove={(e) => {
            const node = e.target as Konva.Line;
            const evt = (e.evt as MouseEvent) ?? null;
            let delta = { x: node.x(), y: node.y() };

            if (evt?.shiftKey) {
              const snapped = snapDeltaTo8(delta.x, delta.y);
              node.position({ x: snapped.x, y: snapped.y });
              delta = snapped;
            }

            setDragState({
              isDragging: true,
              draggedP1: { x: p1.x + delta.x, y: p1.y + delta.y },
              draggedP2: { x: p2.x + delta.x, y: p2.y + delta.y },
            });
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Line;
            const delta = { x: node.x(), y: node.y() };
            const newP1 = { x: p1.x + delta.x, y: p1.y + delta.y };
            const newP2 = { x: p2.x + delta.x, y: p2.y + delta.y };

            node.position({ x: 0, y: 0 });
            setDragState({ isDragging: false, draggedP1: p1, draggedP2: p2 });
            updateShapeState(newP1, newP2);
          }}
          onClick={onSelect}
          onTap={onSelect}
          ref={ref as React.RefObject<Konva.Line>}
        />

        <Circle
          x={currentP1.x}
          y={currentP1.y}
          radius={6}
          fill={"#000"}
          opacity={0.8}
          draggable
          hitStrokeWidth={20}
          onDragStart={() => {
            setDragState({
              isDragging: true,
              draggedP1: p1,
              draggedP2: p2,
            });
          }}
          onDragMove={(e) => {
            const node = e.target as Konva.Circle;
            const evt = (e.evt as MouseEvent) ?? null;
            let newPos = { x: node.x(), y: node.y() };

            if (evt?.shiftKey) {
              const dx = newPos.x - p1.x;
              const dy = newPos.y - p1.y;
              const snapped = snapDeltaTo8(dx, dy);
              newPos = { x: p1.x + snapped.x, y: p1.y + snapped.y };
              node.position(newPos);
            }

            setDragState({
              isDragging: true,
              draggedP1: newPos,
              draggedP2: p2,
            });
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Circle;
            const newPos = { x: node.x(), y: node.y() };

            setDragState({ isDragging: false, draggedP1: p1, draggedP2: p2 });
            updateShapeState(newPos, p2);
          }}
        />

        <Circle
          x={currentP2.x}
          y={currentP2.y}
          radius={6}
          fill={"#000"}
          opacity={0.8}
          draggable
          hitStrokeWidth={20}
          onDragStart={() => {
            setDragState({
              isDragging: true,
              draggedP1: p1,
              draggedP2: p2,
            });
          }}
          onDragMove={(e) => {
            const node = e.target as Konva.Circle;
            const evt = (e.evt as MouseEvent) ?? null;
            let newPos = { x: node.x(), y: node.y() };

            if (evt?.shiftKey) {
              const dx = newPos.x - p2.x;
              const dy = newPos.y - p2.y;
              const snapped = snapDeltaTo8(dx, dy);
              newPos = { x: p2.x + snapped.x, y: p2.y + snapped.y };
              node.position(newPos);
            }

            setDragState({
              isDragging: true,
              draggedP1: p1,
              draggedP2: newPos,
            });
            onDragMove();
          }}
          onDragEnd={(e) => {
            const node = e.target as Konva.Circle;
            const newPos = { x: node.x(), y: node.y() };

            setDragState({ isDragging: false, draggedP1: p1, draggedP2: p2 });
            updateShapeState(p1, newPos);
          }}
        />
      </>
    );
  }

  return null;
});
