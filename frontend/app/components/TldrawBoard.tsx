import * as React from "react";
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
  const [assetUrls, setAssetUrls] = React.useState<any>(undefined);
  const licenseKey = import.meta.env.VITE_TLDRAW_LICENSE_KEY;
  // Only log license presence in development (never log the actual key)
  if (import.meta.env.DEV) {
    console.log('[tldraw] license present:', Boolean(licenseKey));
  }

  // Only load asset URLs on the client side (not during SSR)
  React.useEffect(() => {
    if (typeof window !== "undefined") {
      // Dynamically import to avoid SSR issues
      import("@tldraw/assets/imports.vite").then((module) => {
        const urls = module.getAssetUrlsByImport();
        setAssetUrls(urls);
      }).catch((error) => {
        // Log error message only, not full error object
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to load tldraw assets:", errorMessage);
        // Continue without asset URLs - tldraw will use defaults
      });
    }
  }, []);

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
