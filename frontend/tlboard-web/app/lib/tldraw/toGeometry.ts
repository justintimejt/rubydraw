import * as THREE from "three";
import type { TLShape } from "tldraw";
import { extrudeEllipse, extrudeRectangle } from "../three/extrude";

const SCALE = 0.01;

export function toExtrudedGeometryFromShape(
  shape: TLShape,
  depth = 0.2,
): THREE.BufferGeometry | null {
  if (shape.type !== "geo") return null;

  const props: any = (shape as any).props;

  const w = Number(props.w ?? 0) * SCALE;
  const h = Number(props.h ?? 0) * SCALE;
  const geoKind = String(props.geo ?? "");

  if (!w || !h) return null;

  if (geoKind === "rectangle") {
    return extrudeRectangle(w, h, depth);
  }

  if (geoKind === "ellipse") {
    return extrudeEllipse(w / 2, h / 2, depth);
  }

  return null;
}
