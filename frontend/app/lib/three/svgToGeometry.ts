import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export function extrudeSvgPath(
  svgPath: string,
  depth: number,
  bevel: number
): THREE.BufferGeometry | null {
  try {
    // Wrap path in minimal SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" /></svg>`;
    
    const loader = new SVGLoader();
    const data = loader.parse(svg);
    
    if (data.paths.length === 0) return null;
    
    const shapes: THREE.Shape[] = [];
    for (const path of data.paths) {
      shapes.push(...SVGLoader.createShapes(path));
    }
    
    if (shapes.length === 0) return null;
    
    const geometry = new THREE.ExtrudeGeometry(shapes[0], {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: bevel > 0 ? 2 : 0,
    });
    
    geometry.computeVertexNormals();
    geometry.center();
    
    return geometry;
  } catch (error) {
    console.error('Failed to extrude SVG path:', error);
    return null;
  }
}

