import * as THREE from "three";

function finish(geo: THREE.BufferGeometry) {
  geo.computeVertexNormals();
  geo.center();
  return geo;
}

export function extrudeRectangle(
  w: number,
  h: number,
  depth = 0.2,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2, -h / 2);
  shape.lineTo(w / 2, -h / 2);
  shape.lineTo(w / 2, h / 2);
  shape.lineTo(-w / 2, h / 2);
  shape.closePath();

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  return finish(geo);
}

export function extrudeEllipse(
  rx: number,
  ry: number,
  depth = 0.2,
): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  shape.absellipse(0, 0, rx, ry, 0, Math.PI * 2, false, 0);

  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: false,
  });

  return finish(geo);
}
