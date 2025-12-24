import * as React from "react";
import { useParams } from "react-router";
import type { Editor } from "tldraw";
import * as THREE from "three";

import { SplitPane } from "../components/SplitPane";
import { TldrawBoard } from "../components/TldrawBoard";
import { ThreePreview } from "../components/ThreePreview";
import { toExtrudedGeometryFromShape } from "../lib/tldraw/toGeometry";
import { exportSelectedShapesAsSvg } from "../lib/tldraw/exportSvg";
import { improveSketch } from "../lib/graphql/mutations";
import { extrudeSvgPath } from "../lib/three/svgToGeometry";
import type { GeminiSketchResponse } from "../lib/gemini/improveSketchPrompt";

export const meta = () => [
  { title: "Rubydraw Board" },
  { name: "description", content: "Draw and preview in 3D." },
];

type ImproveState = {
  status: "idle" | "loading" | "success" | "error";
  data: GeminiSketchResponse | null;
  error: string | null;
};

export default function BoardRoute() {
  const params = useParams();
  const boardId = params.boardId ?? "default";

  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [geometry, setGeometry] = React.useState<THREE.BufferGeometry | null>(
    null,
  );
  const [mode, setMode] = React.useState<"spin" | "bob">("spin");
  const [improveState, setImproveState] = React.useState<ImproveState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [selectedShapeIds, setSelectedShapeIds] = React.useState<string[]>([]);

  // Update geometry when shape selection or improve state changes
  React.useEffect(() => {
    if (!editor) return;

    // If we have improved sketch data, use it
    if (improveState.status === "success" && improveState.data) {
      const improvedGeometry = extrudeSvgPath(
        improveState.data.cleanSvgPath,
        improveState.data.suggestedDepth,
        improveState.data.suggestedBevel
      );
      setGeometry(improvedGeometry);
      return;
    }

    // Otherwise, use simple shape conversion
    if (selectedShapeIds.length !== 1) {
      setGeometry(null);
      return;
    }

    const shape = editor.getShape(selectedShapeIds[0]);
    if (!shape) {
      setGeometry(null);
      return;
    }

    setGeometry(toExtrudedGeometryFromShape(shape));
  }, [editor, selectedShapeIds, improveState]);

  // Listen to selection changes
  React.useEffect(() => {
    if (!editor) return;

    const updateSelection = () => {
      const ids = editor.getSelectedShapeIds();
      setSelectedShapeIds(ids);
      
      // Clear improved sketch when selection changes
      if (ids.length === 0 || ids.length !== 1) {
        setImproveState({ status: "idle", data: null, error: null });
      }
    };

    // Initial selection state
    updateSelection();

    // Listen to store changes (selection is tracked in the store)
    const unlisten = editor.store.listen(() => {
      updateSelection();
    });

    return () => {
      unlisten();
    };
  }, [editor]);

  const handleImproveSketch = React.useCallback(async () => {
    if (!editor) return;

    // Check selection directly as fallback
    const currentSelection = editor.getSelectedShapeIds();
    if (currentSelection.length === 0) {
      setImproveState({
        status: "error",
        data: null,
        error: "Please select a shape first",
      });
      return;
    }

    const svg = exportSelectedShapesAsSvg(editor);
    if (!svg) {
      setImproveState({
        status: "error",
        data: null,
        error: "No shapes selected or unable to export SVG",
      });
      return;
    }

    setImproveState({ status: "loading", data: null, error: null });

    try {
      const result = await improveSketch(svg);
      
      if (result.errors && result.errors.length > 0) {
        setImproveState({
          status: "error",
          data: null,
          error: result.errors.join(", "),
        });
        return;
      }

      if (!result.result) {
        setImproveState({
          status: "error",
          data: null,
          error: "No result returned from server",
        });
        return;
      }

      setImproveState({
        status: "success",
        data: {
          cleanSvgPath: result.result.cleanSvgPath,
          isClosed: result.result.isClosed,
          suggestedDepth: result.result.suggestedDepth,
          suggestedBevel: result.result.suggestedBevel,
          notes: result.result.notes,
        },
        error: null,
      });
    } catch (error) {
      setImproveState({
        status: "error",
        data: null,
        error: error instanceof Error ? error.message : "Failed to improve sketch",
      });
    }
  }, [editor]);

  const handleResetImprovement = React.useCallback(() => {
    setImproveState({ status: "idle", data: null, error: null });
  }, []);

  // Check selection directly from editor if available, otherwise use state
  const hasSelection = editor ? editor.getSelectedShapeIds().length > 0 : selectedShapeIds.length > 0;
  const canImprove = hasSelection && improveState.status !== "loading";

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
              flexDirection: "column",
              gap: 8,
              background: "rgba(255,255,255,0.9)",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "8px 12px",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setMode("spin")}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: mode === "spin" ? "#f3f4f6" : "white",
                  cursor: "pointer",
                }}
              >
                Spin
              </button>
              <button
                onClick={() => setMode("bob")}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #d1d5db",
                  borderRadius: 4,
                  background: mode === "bob" ? "#f3f4f6" : "white",
                  cursor: "pointer",
                }}
              >
                Bob
              </button>
            </div>
            <button
              onClick={handleImproveSketch}
              disabled={!canImprove}
              title={!hasSelection ? "Select a shape first" : improveState.status === "loading" ? "Improving..." : "Improve selected sketch"}
              style={{
                padding: "6px 12px",
                border: "1px solid #3b82f6",
                borderRadius: 4,
                background: canImprove ? "#3b82f6" : "#9ca3af",
                color: "white",
                cursor: canImprove ? "pointer" : "not-allowed",
                fontWeight: 500,
                fontSize: 13,
                opacity: canImprove ? 1 : 0.6,
              }}
            >
              {improveState.status === "loading" ? "Improving..." : "Improve Sketch"}
            </button>
            {improveState.status === "success" && (
              <button
                onClick={handleResetImprovement}
                style={{
                  padding: "4px 8px",
                  border: "1px solid #6b7280",
                  borderRadius: 4,
                  background: "white",
                  color: "#6b7280",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Reset
              </button>
            )}
          </div>

          {improveState.status === "error" && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                background: "rgba(239, 68, 68, 0.9)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                maxWidth: 300,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
              <div>{improveState.error}</div>
            </div>
          )}

          {improveState.status === "success" && improveState.data && (
            <div
              style={{
                position: "absolute",
                top: 12,
                right: 12,
                zIndex: 10,
                background: "rgba(34, 197, 94, 0.9)",
                color: "white",
                padding: "8px 12px",
                borderRadius: 8,
                fontSize: 12,
                maxWidth: 300,
                boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
              }}
            >
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Improved!</div>
              <div style={{ fontSize: 11, opacity: 0.9 }}>{improveState.data.notes}</div>
            </div>
          )}

          <ThreePreview geometry={geometry} mode={mode} />
        </div>
      }
    />
  );
}
