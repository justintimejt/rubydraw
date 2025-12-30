import * as React from "react";
import type { Editor } from "tldraw";
import type { TLShapeId } from "tldraw";
import * as THREE from "three";

import { TldrawBoard } from "../components/TldrawBoard";
import { ThreePreview } from "../components/ThreePreview";
import { toExtrudedGeometryFromShape } from "../lib/tldraw/toGeometry";
import { exportSelectedShapesAsSvg } from "../lib/tldraw/exportSvg";
import { exportSelectedShapesAsPng } from "../lib/tldraw/exportPng";
import { improveSketch } from "../lib/graphql/mutations";
import { addImprovedImageToCanvas } from "../lib/tldraw/addImprovedImage";

export const meta = () => [
  { title: "Rubydraw Board" },
  { name: "description", content: "Draw and preview in 3D." },
];

type ImprovedSketchData = {
  imageBase64: string;
  title: string;
  style: string;
  palette: string[];
  background: string;
  notes: string;
};

type ImproveState = {
  status: "idle" | "loading" | "success" | "error";
  data: ImprovedSketchData | null;
  error: string | null;
};

export default function Board() {
  const [editor, setEditor] = React.useState<Editor | null>(null);
  const [geometry, setGeometry] = React.useState<THREE.BufferGeometry | null>(
    null,
  );
  const [viewMode, setViewMode] = React.useState<"2d" | "3d">("2d");
  const [improveState, setImproveState] = React.useState<ImproveState>({
    status: "idle",
    data: null,
    error: null,
  });
  const [selectedShapeIds, setSelectedShapeIds] = React.useState<string[]>([]);

  // Update geometry when shape selection or improve state changes
  React.useEffect(() => {
    if (!editor) {
      console.log('[Board] No editor, clearing geometry');
      setGeometry(null);
      return;
    }

    // Note: Improved sketches are now images, not 3D geometry
    // Keep using original shape geometry for 3D preview

    // Otherwise, use simple shape conversion
    if (selectedShapeIds.length !== 1) {
      console.log('[Board] Selection count:', selectedShapeIds.length, '- clearing geometry');
      setGeometry(null);
      return;
    }

    const shape = editor.getShape(selectedShapeIds[0] as TLShapeId);
    if (!shape) {
      console.log('[Board] Shape not found, clearing geometry');
      setGeometry(null);
      return;
    }

    console.log('[Board] Converting shape to geometry:', shape.type);
    const shapeGeometry = toExtrudedGeometryFromShape(shape);
    console.log('[Board] Shape geometry result:', shapeGeometry ? 'success' : 'null');
    setGeometry(shapeGeometry);
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

    setImproveState({ status: "loading", data: null, error: null });

    try {
      // Export as PNG (preferred for image generation)
      const pngBase64 = await exportSelectedShapesAsPng(editor);
      console.log('Exported PNG base64 length:', pngBase64?.length);
      
      if (!pngBase64 || typeof pngBase64 !== 'string' || pngBase64.trim().length === 0) {
        setImproveState({
          status: "error",
          data: null,
          error: `Unable to export PNG. Got type: ${typeof pngBase64}. Please try selecting a different shape.`,
        });
        return;
      }

      // Optionally export SVG for structural hints
      const svg = await exportSelectedShapesAsSvg(editor);

      const result = await improveSketch(pngBase64, svg || undefined);
      
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

      const improvedData = {
        imageBase64: result.result.imageBase64,
        title: result.result.title,
        style: result.result.style,
        palette: result.result.palette,
        background: result.result.background,
        notes: result.result.notes,
      };

      setImproveState({
        status: "success",
        data: improvedData,
        error: null,
      });

      // Add the improved image to the canvas
      const currentSelection = editor.getSelectedShapeIds();
      const originalShapeId = currentSelection.length > 0 ? currentSelection[0] : undefined;
      addImprovedImageToCanvas(editor, improvedData.imageBase64, originalShapeId);
    } catch (error) {
      console.error("Improve sketch error:", error);
      let errorMessage = "Failed to improve sketch";
      
      if (error instanceof Error) {
        if (error.message.includes("fetch")) {
          errorMessage = `Network error: Cannot connect to backend. Make sure the Rails server is running on ${import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql'}`;
        } else {
          errorMessage = error.message;
        }
      }
      
      setImproveState({
        status: "error",
        data: null,
        error: errorMessage,
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
    <div style={{ position: "fixed", inset: 0 }}>
      {/* Top center control panel */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          display: "flex",
          gap: 8,
          alignItems: "center",
        }}
      >
        {/* View toggle button */}
        <button
          onClick={() => setViewMode(viewMode === "2d" ? "3d" : "2d")}
          style={{
            padding: "8px 16px",
            border: "1px solid #3b82f6",
            borderRadius: 6,
            background: "#3b82f6",
            color: "white",
            cursor: "pointer",
            fontWeight: 500,
            fontSize: 14,
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          {viewMode === "2d" ? "View 3D" : "View 2D"}
        </button>

        {/* Improve sketch button - only show in 2D mode */}
        {viewMode === "2d" && (
          <button
            onClick={handleImproveSketch}
            disabled={!canImprove}
            title={!hasSelection ? "Select a shape first" : improveState.status === "loading" ? "Improving..." : "Improve selected sketch"}
            style={{
              padding: "8px 16px",
              border: "1px solid #3b82f6",
              borderRadius: 6,
              background: canImprove ? "#3b82f6" : "#9ca3af",
              color: "white",
              cursor: canImprove ? "pointer" : "not-allowed",
              fontWeight: 500,
              fontSize: 14,
              opacity: canImprove ? 1 : 0.6,
              boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            }}
          >
            {improveState.status === "loading" ? "Improving..." : "Improve Sketch"}
          </button>
        )}

        {/* Reset button - only show in 2D mode when success */}
        {viewMode === "2d" && improveState.status === "success" && (
          <button
            onClick={handleResetImprovement}
            style={{
              padding: "8px 16px",
              border: "1px solid #6b7280",
              borderRadius: 6,
              background: "white",
              color: "#6b7280",
              cursor: "pointer",
              fontWeight: 500,
              fontSize: 14,
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Error message */}
      {improveState.status === "error" && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 12,
            zIndex: 1000,
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

      {/* Success message */}
      {improveState.status === "success" && improveState.data && (
        <div
          style={{
            position: "absolute",
            top: 60,
            right: 12,
            zIndex: 1000,
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

      {/* 2D View */}
      {viewMode === "2d" && (
        <div style={{ position: "absolute", inset: 0 }}>
          <TldrawBoard
            persistenceKey="board:default"
            onEditor={(ed) => setEditor(ed)}
          />
        </div>
      )}

      {/* 3D View */}
      {viewMode === "3d" && (
        <div style={{ position: "absolute", inset: 0 }}>
          <ThreePreview geometry={geometry} mode="spin" />
        </div>
      )}
    </div>
  );
}
