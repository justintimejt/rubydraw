import * as THREE from 'three';
import { SVGLoader } from 'three/examples/jsm/loaders/SVGLoader.js';

export function extrudeSvgPath(
  svgPath: string,
  depth: number,
  bevel: number
): THREE.BufferGeometry | null {
  try {
    console.log('[extrudeSvgPath] Starting:', {
      svgPathLength: svgPath?.length,
      svgPathPreview: svgPath?.substring(0, 50),
      depth,
      bevel,
    });

    if (!svgPath || typeof svgPath !== 'string' || svgPath.trim().length === 0) {
      console.error('[extrudeSvgPath] Invalid SVG path:', svgPath);
      return null;
    }

    // Wrap path in minimal SVG
    const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${svgPath}" /></svg>`;
    
    const loader = new SVGLoader();
    const data = loader.parse(svg);
    
    console.log('[extrudeSvgPath] Parsed SVG paths:', data.paths.length);
    
    if (data.paths.length === 0) {
      console.error('[extrudeSvgPath] No paths found in SVG');
      return null;
    }
    
    const shapes: THREE.Shape[] = [];
    for (const path of data.paths) {
      const pathShapes = SVGLoader.createShapes(path);
      console.log('[extrudeSvgPath] Created shapes from path:', pathShapes.length);
      shapes.push(...pathShapes);
    }
    
    if (shapes.length === 0) {
      console.error('[extrudeSvgPath] No shapes created from paths');
      return null;
    }
    
    console.log('[extrudeSvgPath] Creating ExtrudeGeometry with', shapes.length, 'shapes');
    const geometry = new THREE.ExtrudeGeometry(shapes[0], {
      depth: depth || 0.1,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: bevel > 0 ? 2 : 0,
    });
    
    geometry.computeVertexNormals();
    geometry.center();
    
    console.log('[extrudeSvgPath] Geometry created successfully:', {
      vertices: geometry.attributes.position?.count || 0,
      hasNormals: !!geometry.attributes.normal,
    });
    
    return geometry;
  } catch (error) {
    console.error('[extrudeSvgPath] Failed to extrude SVG path:', error);
    if (error instanceof Error) {
      console.error('[extrudeSvgPath] Error details:', error.message, error.stack);
    }
    return null;
  }
}

