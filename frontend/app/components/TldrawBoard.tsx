import type { Editor } from "tldraw";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";

export function TldrawBoard({
  persistenceKey,
  onEditor,
}: {
  persistenceKey: string;
  onEditor?: (editor: Editor) => void;
}) {
  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Tldraw
        persistenceKey={persistenceKey}
        onMount={(editor) => {
          onEditor?.(editor);
        }}
      />
    </div>
  );
}
