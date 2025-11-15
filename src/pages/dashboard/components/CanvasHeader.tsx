import React, { useState } from "react";
import type Konva from "konva";
import type { Shape } from "../../../types";

interface CanvasHeaderProps {
  onAddShape: (type: Shape["type"]) => void;
  onScreenshotCurrent?: () => void;
  onScreenshotFull?: () => void;
  stageRef?: React.RefObject<Konva.Stage | null>;
  onReset?: () => void;
}

export const CanvasHeader: React.FC<CanvasHeaderProps> = ({
  onAddShape,
  onScreenshotCurrent,
  onScreenshotFull,
  stageRef,
  onReset,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const shapeTypes: Array<{ type: Shape["type"]; label: string }> = [
    { type: "rect", label: "Rectangle" },
    { type: "circle", label: "Circle" },
    { type: "triangle", label: "Triangle" },
    { type: "line", label: "Line" },
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
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Add Shape ▼
        </button>

        {isOpen && (
          <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg">
            {shapeTypes.map(({ type, label }) => (
              <div
                key={type}
                role="button"
                tabIndex={0}
                draggable
                onClick={() => {
                  try {
                    onAddShape(type);
                    setIsOpen(false);
                  } catch (err) {
                    void err;
                  }
                }}
                onDragStart={(e: React.DragEvent<HTMLDivElement>) => {
                  try {
                    const dt = e.dataTransfer;
                    const shapeProps: Partial<Shape> = {
                      fill: "",
                      ...(type === "rect" && { width: 120, height: 80 }),
                      ...(type === "circle" && { radius: 50 }),
                      ...(type === "triangle" && { radius: 70 }),
                      ...(type === "line" && { radius: 100 }),
                    };
                    const payload = JSON.stringify({
                      type,
                      fill: "none",
                      shapeProps,
                    });
                    dt.setData("application/json", payload);
                    dt.setData("text/plain", payload);
                    dt.effectAllowed = "copy";

                    if (typeof document !== "undefined") {
                      const img = new Image();
                      img.src =
                        "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
                      img.style.position = "absolute";
                      img.style.left = "-9999px";
                      img.style.top = "-9999px";
                      document.body.appendChild(img);
                      try {
                        dt.setDragImage(img, 0, 0);
                      } catch (err) {
                        void err;
                      }
                      setTimeout(() => img.remove(), 200);
                    }
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
          onClick={() => {
            try {
              if (
                typeof window !== "undefined" &&
                window.confirm("Reset all data? This cannot be undone.")
              ) {
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
            } catch (err) {
              void err;
            }
          }}
          className="px-3 py-1 bg-red-200 text-red-800 rounded hover:bg-red-300 text-sm"
        >
          Reset
        </button>
      </div>
    </div>
  );
};
