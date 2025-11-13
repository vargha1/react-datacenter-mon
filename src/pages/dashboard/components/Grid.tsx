import { Line } from "react-konva";

/* ---------- Grid Component ---------- */
const GRID_SIZE = 20;
export const GridBackground: React.FC<{ width: number; height: number }> = ({
  width,
  height,
}) => {
  const lines = [];
  for (let i = 0; i < width / GRID_SIZE; i++) {
    lines.push(
      <Line
        key={`v-${i}`}
        points={[i * GRID_SIZE, 0, i * GRID_SIZE, height]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    );
  }
  for (let i = 0; i < height / GRID_SIZE; i++) {
    lines.push(
      <Line
        key={`h-${i}`}
        points={[0, i * GRID_SIZE, width, i * GRID_SIZE]}
        stroke="#e0e0e0"
        strokeWidth={1}
      />
    );
  }
  return <>{lines}</>;
};
