import type { ReactNode } from "react";

export function SplitPane({
  left,
  right,
}: {
  left: ReactNode;
  right: ReactNode;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        height: "100vh",
        width: "100vw",
      }}
    >
      <div style={{ position: "relative", borderRight: "1px solid #e5e7eb" }}>
        {left}
      </div>
      <div style={{ position: "relative" }}>{right}</div>
    </div>
  );
}
