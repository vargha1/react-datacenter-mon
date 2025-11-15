import React from "react";
import type { Shape } from "../../../types";

interface PropertiesPanelProps {
  shape: Shape;
  onNameChange: (name: string) => void;
  onFontSizeChange: (fontSize: number) => void;
  onStrokeWidthChange: (strokeWidth: number) => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  shape,
  onNameChange,
  onFontSizeChange,
  onStrokeWidthChange,
}) => {
  const fontSizeStyle = shape.fontSize
    ? { fontSize: `${shape.fontSize}px` }
    : undefined;

  return (
    <div
      style={fontSizeStyle}
      className="absolute right-4 top-20 bg-white border rounded p-3 shadow z-20 w-64"
    >
      <h3 className="font-bold text-sm mb-2">Properties</h3>
      <div className="text-sm">
        <div className="mb-2">
          <div className="text-xs text-gray-500">ID</div>
          <div className="break-words text-xs">{shape.id}</div>
        </div>
        <div>
          <div className="text-xs text-gray-500">Name</div>
          <input
            className="w-full border rounded px-2 py-1 text-sm"
            value={shape.name ?? ""}
            onChange={(e) => onNameChange(e.target.value)}
          />
        </div>
        <div className="mt-2">
          <div className="text-xs text-gray-500">Font size</div>
          <input
            type="number"
            min={0}
            max={72}
            className="w-full border rounded px-2 py-1 text-sm"
            value={shape.fontSize ?? 14}
            onChange={(e) => {
              const v = Number(e.target.value) || 14;
              if (v >= 0 && v <= 72) onFontSizeChange(v);
            }}
          />
          <div className="mt-2">
            <div className="text-xs text-gray-500">Stroke width</div>
            <input
              type="number"
              min={0}
              max={20}
              step={1}
              className="w-full border rounded px-2 py-1 text-sm"
              value={shape.strokeWidth ?? 2}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v) && v >= 0 && v <= 20)
                  onStrokeWidthChange(v);
              }}
            />
          </div>
        </div>
        {shape.generatedFromLines && (
          <div className="mt-2 text-xs text-gray-600">Generated from lines</div>
        )}
      </div>
    </div>
  );
};
