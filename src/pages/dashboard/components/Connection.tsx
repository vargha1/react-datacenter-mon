import type Konva from "konva";
import type { Connection } from "../../../types";
import { anchorToPoint } from "../utils/anchor";
import { Line } from "react-konva";

/* ---------- Connection Component ---------- */

export const ConnectionLine: React.FC<{
  connection: Connection;
  layer: Konva.Layer | null;
  stroke: string;
  strokeWidth: number;
  onRemove?: (id: string) => void;
}> = ({ connection, layer, stroke, strokeWidth, onRemove }) => {
  if (!layer) return null;

  const from = anchorToPoint(layer, connection.from);
  const to = anchorToPoint(layer, connection.to);

  const points: number[] = [from.x, from.y];
  connection.intermediatePoints.forEach((pt) => {
    points.push(pt.x, pt.y);
  });
  points.push(to.x, to.y);

  return (
    <Line
      id={connection.id}
      key={connection.id}
      points={points}
      stroke={stroke}
      strokeWidth={strokeWidth}
      onContextMenu={(e) => {
        e.evt.preventDefault();
        onRemove?.(connection.id);
      }}
    />
  );
};
