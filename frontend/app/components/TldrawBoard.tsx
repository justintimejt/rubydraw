import * as React from "react";
import type { Editor } from "tldraw";
import { Tldraw } from "tldraw";
import "tldraw/tldraw.css";
import { getAssetUrlsByImport } from "@tldraw/assets/imports.vite";

export function TldrawBoard({
  persistenceKey,
  onEditor,
}: {
  persistenceKey: string;
  onEditor?: (editor: Editor) => void;
}) {
  const assetUrls = React.useMemo(() => getAssetUrlsByImport(), []);
  const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      <Tldraw
        persistenceKey={persistenceKey}
        assetUrls={assetUrls}
        licenseKey={licenseKey}
        onMount={(editor) => {
          onEditor?.(editor);
        }}
      />
    </div>
  );
}
