import * as React from "react";
import { useParams } from "react-router";
import type { Editor } from "tldraw";
import * as THREE from "three";

import { SplitPane } from "../components/SplitPane";
import { TldrawBoard } from "../components/TldrawBoard";
import { ThreePreview } from "../components/ThreePreview";
import { toExtrudedGeometryFromShape } from "../lib/tldraw/toGeometry";

export const meta = () => [
  { title: "Rubydraw Board" },
  { name: "description", content: "Draw and preview in 3D." },
];

export default function BoardRoute() {
  const params = useParams();
  const boardId = params.boardId ?? "default";

  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [geometry, setGeometry] = React.useState<THREE.BufferGeometry | null>(
    null,
  );
  const [mode, setMode] = React.useState<"spin" | "bob">("spin");

  React.useEffect(() => {
    if (!editor) return;

    const unlisten = editor.store.listen(() => {
      const ids = editor.getSelectedShapeIds();

      if (ids.length !== 1) {
        setGeometry(null);
        return;
      }

      const shape = editor.getShape(ids[0]);
      if (!shape) {
        setGeometry(null);
        return;
      }

      setGeometry(toExtrudedGeometryFromShape(shape));
    });

    return () => {
      unlisten();
    };
  }, [editor]);

  return (
    <SplitPane
      left={
        <TldrawBoard
          persistenceKey={`board:${boardId}`}
          onEditor={(ed) => setEditor(ed)}
        />
      }
      right={
        <div style={{ position: "absolute", inset: 0 }}>
          <div
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              zIndex: 10,
              display: "flex",
              gap: 8,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "6px 10px",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
              fontSize: 13,
            }}
          >
            <button onClick={() => setMode("spin")}>Spin</button>
            <button onClick={() => setMode("bob")}>Bob</button>
          </div>

          <ThreePreview geometry={geometry} mode={mode} />
        </div>
      }
    />
  );
}
