import { useState } from "react";
import type { Shape } from "../../../types";

/* ---------- Header Component ---------- */
export const Header: React.FC<{ onAddShape: (type: Shape["type"]) => void }> = ({
  onAddShape,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const shapeTypes: Array<{ type: Shape["type"]; label: string }> = [
    { type: "rect", label: "Rectangle" },
    { type: "circle", label: "Circle" },
    { type: "triangle", label: "Triangle" },
    { type: "line", label: "Line" },
  ];

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
              <button
                key={type}
                onClick={() => {
                  onAddShape(type);
                  setIsOpen(false);
                }}
                className="block w-full text-left px-4 py-2 hover:bg-gray-100"
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="text-sm text-gray-600">
        Click shapes to draw connections. Click empty space to add waypoints.
      </div>
    </div>
  );
};