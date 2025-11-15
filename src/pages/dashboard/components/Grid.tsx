import React from "react";
import { Line } from "react-konva";

const GRID_SIZE = 20;

interface GridBackgroundProps {
  width: number;
  height: number;
}

export const GridBackground: React.FC<GridBackgroundProps> = ({
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
