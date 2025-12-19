import type { Route } from "./+types/board";
import throttle from "lodash/throttle";
import { useEffect, useMemo, useState } from "react";
import {
  Tldraw,
  createTLStore,
  defaultBindingUtils,
  defaultShapeUtils,
  getSnapshot,
  loadSnapshot,
  type TLEditorSnapshot,
} from "tldraw";
import "tldraw/tldraw.css";

const PERSISTENCE_KEY = "tlboard:mvp:v1";

type LoadState = "loading" | "ready";

export const meta: Route.MetaFunction = () => [
  { title: "Board | tlboard" },
  { name: "description", content: "Whiteboard powered by tldraw." },
];

export default function Board() {
  const store = useMemo(
    () =>
      createTLStore({
        shapeUtils: defaultShapeUtils,
        bindingUtils: defaultBindingUtils,
      }),
    [],
  );
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsClient(true);

    let isCancelled = false;
    const throttledSave = throttle(() => {
      try {
        const snapshot = getSnapshot(store);
        window.localStorage.setItem(
          PERSISTENCE_KEY,
          JSON.stringify(snapshot),
        );
      } catch (err) {
        console.error(err);
        setError((err as Error).message ?? "Unable to save board.");
      }
    }, 500);

    try {
      const existing = window.localStorage.getItem(PERSISTENCE_KEY);
      if (existing) {
        const parsed = JSON.parse(existing) as TLEditorSnapshot;
        loadSnapshot(store, parsed);
      }
    } catch (err) {
      console.error(err);
      setError((err as Error).message ?? "Unable to load saved board.");
    } finally {
      if (!isCancelled) {
        setLoadState("ready");
      }
    }

    const unsubscribe = store.listen(() => throttledSave());

    return () => {
      isCancelled = true;
      throttledSave.cancel();
      unsubscribe();
    };
  }, [store]);

  if (!isClient || loadState === "loading") {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950 text-white">
        Loading board...
      </div>
    );
  }

  return (
    <div className="fixed inset-0">
      {error ? (
        <div className="absolute left-4 top-4 z-10 max-w-xs rounded-lg border border-red-200 bg-white/90 p-3 text-sm text-red-700 shadow-lg backdrop-blur dark:border-red-900/50 dark:bg-red-950/70 dark:text-red-100">
          <p className="font-semibold">Local save error</p>
          <p>{error}</p>
        </div>
      ) : null}
      <Tldraw store={store} />
    </div>
  );
}
