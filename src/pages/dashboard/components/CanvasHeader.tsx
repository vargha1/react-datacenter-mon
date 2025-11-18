import React, { useState } from "react";
import type Konva from "konva";
import type { Shape } from "../../../types";
import { getDataUrl as getSvgDataUrl } from "../assets/svgs";

interface CanvasHeaderProps {
  onAddShape: (type: Shape["type"], shapeProps?: Partial<Shape>) => void;
  onScreenshotCurrent?: () => void;
  onScreenshotFull?: () => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
  onReset?: () => void;
  viewMode?: boolean;
  onToggleViewMode?: (next: boolean) => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  onAddShape,
  onScreenshotCurrent,
  onScreenshotFull,
  stageRef,
  onReset,
  viewMode,
  onToggleViewMode,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const UPS_SVG = `<?xml version="1.0" encoding="utf-8"?>
<svg width="83" height="143" viewBox="0 0 83 143" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.25 1.25V31.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M61.25 1.25V31.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 111.25V141.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M81.25 31.25H1.25V111.25H81.25V31.25Z" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 71.25H1.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M81.25 31.25L41.25 71.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M41.25 71.25L81.25 111.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.25 51.25C13.9167 48.5833 16.5833 48.5833 19.25 51.25C21.9167 53.9167 24.5833 53.9167 27.25 51.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M11.25 91.25C13.9167 88.5833 16.5833 88.5833 19.25 91.25C21.9167 93.9167 24.5833 93.9167 27.25 91.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M55.25 71.25H69.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
<path d="M62.25 64.25V78.25" stroke="black" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`;
  const UPS_DATA_URL = `data:image/svg+xml;utf8,${encodeURIComponent(UPS_SVG)}`;

  const shapeTypes: Array<{
    type: string;
    label: string;
    shapeProps?: Partial<Shape>;
  }> = [
    {
      type: "rect",
      label: "Rectangle",
      shapeProps: { width: 120, height: 80 },
    },
    {
      type: "transformer",
      label: "Transformer",
      shapeProps: {
        width: 43,
        height: 155,
        image: getSvgDataUrl("transformer")!,
        fontSize: 0,
        strokeWidth: 0,
      },
    },
    {
      type: "surge_arrester",
      label: "Surge Arrester",
      shapeProps: {
        width: 43,
        height: 173,
        image: getSvgDataUrl("surge_arrester") ?? undefined,
        fontSize: 0,
        strokeWidth: 0,
      },
    },
    {
      type: "selector_switch",
      label: "Selector Switch",
      shapeProps: {
        width: 120,
        height: 180,
        image: getSvgDataUrl("selector_switch") ?? undefined,
        fontSize: 0,
        strokeWidth: 0,
      },
    },
    {
      type: "rectifier",
      label: "Rectifier",
      shapeProps: {
        width: 34,
        height: 90,
        image: getSvgDataUrl("rectifier") ?? undefined,
        fontSize: 0,
        strokeWidth: 0,
      },
    },
    {
      type: "RCBO",
      label: "RCBO",
      shapeProps: {
        width: 38,
        height: 175,
        image: getSvgDataUrl("RCBO") ?? undefined,
        fontSize: 0,
        strokeWidth: 0,
      },
    },
    { type: "circle", label: "Circle", shapeProps: { radius: 50 } },
    { type: "triangle", label: "Triangle", shapeProps: { radius: 70 } },
    { type: "line", label: "Line", shapeProps: { radius: 100 } },
    {
      type: "ups",
      label: "UPS",
      shapeProps: {
        width: 83,
        height: 143,
        image: UPS_DATA_URL,
        fontSize: 0,
        strokeWidth: 0,
        name: "UPS",
      },
    },
  ];

  const animateZoom = (factor: number) => {
    try {
      const st = stageRef?.current;
      if (!st) return;
      const ANIM_MS = 200;
      const oldScale = st.scaleX() ?? 1;
      const newScale = Math.max(0.1, Math.min(4, oldScale * factor));
      const pointer = { x: st.width() / 2, y: st.height() / 2 };
      const centerStageCoords = {
        x: (pointer.x - st.x()) / oldScale,
        y: (pointer.y - st.y()) / oldScale,
      };
      const newPos = {
        x: pointer.x - centerStageCoords.x * newScale,
        y: pointer.y - centerStageCoords.y * newScale,
      };
      const start = performance.now();
      const startScale = oldScale;
      const startPos = { x: st.x(), y: st.y() };
      const step = (t: number) => {
        const p = Math.min(1, (t - start) / ANIM_MS);
        const ease = 0.5 - Math.cos(p * Math.PI) / 2;
        const sc = startScale + (newScale - startScale) * ease;
        const pos = {
          x: startPos.x + (newPos.x - startPos.x) * ease,
          y: startPos.y + (newPos.y - startPos.y) * ease,
        };
        st.scale({ x: sc, y: sc });
        st.position(pos);
        st.batchDraw();
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    } catch (err) {
      void err;
    }
  };

  return (
    <div className="absolute top-0 left-0 right-0 bg-white border-b border-gray-300 p-4 flex items-center gap-4 z-10">
      <h1 className="text-xl font-bold">Circuit Designer</h1>

      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={!!viewMode}
          className={`px-4 py-2 ${
            viewMode
              ? "bg-gray-200 text-gray-600"
              : "bg-blue-500 text-white hover:bg-blue-600"
          } rounded`}
        >
          Add Shape ▼
        </button>

        {isOpen && !viewMode && (
          <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
            {shapeTypes.map(({ type, label, shapeProps }) => (
              <div
                key={type}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => {
                  try {
                    onAddShape(type as Shape["type"], shapeProps);
                    setIsOpen(false);
                  } catch (err) {
                    void err;
                  }
                }}
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                  try {
                    const dt = e.dataTransfer;
                    const baseProps: Partial<Shape> = { fill: "" };
                    const mergedShapeProps = {
                      ...(baseProps as any),
                      ...(shapeProps || {}),
                    } as Partial<Shape>;
                    const payload = JSON.stringify({
                      type,
                      fill: "none",
                      shapeProps: mergedShapeProps,
                    });
                    dt.setData("application/json", payload);
                    dt.setData("text/plain", payload);
                    dt.effectAllowed = "copy";
                  } catch (err) {
                    void err;
                  }
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="text-sm text-gray-600">
        Click shapes to draw connections. Click empty space to add waypoints.
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() =>
            !document.fullscreenElement
              ? document.body.requestFullscreen()
              : document.exitFullscreen()
          }
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Fullscreen
        </button>

        <button
          onClick={() => animateZoom(1.5)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Zoom +
        </button>
        <button
          onClick={() => animateZoom(1 / 1.5)}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Zoom -
        </button>

        <button
          onClick={onScreenshotCurrent}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Screenshot (view)
        </button>
        <button
          onClick={onScreenshotFull}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm"
        >
          Screenshot (full)
        </button>

        <button
          disabled={viewMode}
          onClick={() => {
            try {
              if (typeof window !== "undefined" && viewMode == false) {
                if (window.confirm("Reset all data? This cannot be undone.")) {
                  try {
                    if (onReset) onReset();
                  } catch (err) {
                    void err;
                  }
                  try {
                    localStorage.removeItem("circuit-designer-state");
                  } catch (err) {
                    void err;
                  }
                }
              }
            } catch (err) {
              void err;
            }
          }}
          className={`px-3 py-1 ${
            viewMode
              ? "bg-gray-200 hover:bg-gray-300"
              : "bg-red-200 text-red-800 hover:bg-red-300"
          } rounded text-sm`}
        >
          Reset
        </button>

        <button
          onClick={() => onToggleViewMode?.(!viewMode)}
          className={`px-3 py-1 rounded text-sm ${
            viewMode
              ? "bg-green-200 text-green-800"
              : "bg-yellow-200 text-yellow-800 hover:bg-yellow-300"
          }`}
        >
          {viewMode ? "Exit View" : "View Mode"}
        </button>
      </div>
    </div>
  );
};
