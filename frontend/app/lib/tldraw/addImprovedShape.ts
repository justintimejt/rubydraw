import type { Editor } from 'tldraw';
import { createShapeId } from 'tldraw';

/**
 * Adds the improved SVG path as a shape to the tldraw canvas
 * Creates an SVG image from the path and embeds it as an image shape
 * @param editor - The tldraw editor instance
 * @param svgPath - The cleaned SVG path string (just the 'd' attribute value)
 * @param originalShapeId - Optional ID of the original shape to replace or position near
 */
export function addImprovedShapeToCanvas(
  editor: Editor,
  svgPath: string,
  originalShapeId?: string
): void {
  try {
    // Get the original shape's position if provided
    let x = 100;
    let y = 100;
    
    if (originalShapeId) {
      const originalShape = editor.getShape(originalShapeId);
      if (originalShape) {
        const bounds = editor.getShapeGeometry(originalShape).bounds;
        x = bounds.x + bounds.w + 50; // Position to the right of original
        y = bounds.y;
      }
    }

    // Parse SVG path to points
    const points = parseSvgPathToPoints(svgPath, 0, 0);
    
    if (points.length === 0) {
      console.warn('Could not parse SVG path to points, path:', svgPath.substring(0, 100));
      return;
    }
    
    // Get SVG bounds for positioning
    const svgBounds = getSvgPathBounds(svgPath);
    
    // Normalize points to start at origin
    const firstPoint = points[0];
    const normalizedPoints = points.map(p => ({
      x: p.x - firstPoint.x,
      y: p.y - firstPoint.y,
      z: p.pressure || 0.5, // z is pressure in tldraw
    }));
    
    // Create draw shape with segments structure
    // In tldraw v4, draw shapes use segments array with type 'free' and points
    const drawShapeId = createShapeId();
    
    editor.createShape({
      id: drawShapeId,
      type: 'draw',
      x: x + firstPoint.x,
      y: y + firstPoint.y,
      props: {
        segments: [
          {
            type: 'free',
            points: normalizedPoints,
          },
        ],
        color: 'blue',
        fill: 'none',
        dash: 'draw',
        size: 'm',
        isComplete: true,
        isClosed: true,
        isPen: false,
        scale: 1,
      },
    });
    
    // Select the new shape
    editor.setSelectedShapeIds([drawShapeId]);
    
    console.log('Added improved shape to canvas:', drawShapeId, 'with', normalizedPoints.length, 'points');
  } catch (error) {
    console.error('Error adding improved shape to canvas:', error);
  }
}

/**
 * Create an SVG element from a path string
 */
function createSvgFromPath(pathString: string): SVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  
  path.setAttribute('d', pathString);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', '#3b82f6'); // blue-500
  path.setAttribute('stroke-width', '2');
  
  // Get bounds to set viewBox
  const bounds = getSvgPathBounds(pathString);
  svg.setAttribute('viewBox', `${bounds.x} ${bounds.y} ${bounds.width} ${bounds.height}`);
  svg.setAttribute('width', bounds.width.toString());
  svg.setAttribute('height', bounds.height.toString());
  
  svg.appendChild(path);
  return svg;
}

/**
 * Get approximate bounds of an SVG path
 */
function getSvgPathBounds(pathString: string): { x: number; y: number; width: number; height: number } {
  const points = parseSvgPathToPoints(pathString, 0, 0);
  
  if (points.length === 0) {
    return { x: 0, y: 0, width: 200, height: 200 };
  }
  
  let minX = points[0].x;
  let minY = points[0].y;
  let maxX = points[0].x;
  let maxY = points[0].y;
  
  for (const point of points) {
    minX = Math.min(minX, point.x);
    minY = Math.min(minY, point.y);
    maxX = Math.max(maxX, point.x);
    maxY = Math.max(maxY, point.y);
  }
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX || 200,
    height: maxY - minY || 200,
  };
}

/**
 * Parse SVG path commands to tldraw points
 * Handles M (move), L (line), C (cubic bezier), Q (quadratic bezier), Z (close) commands
 */
function parseSvgPathToPoints(svgPath: string, offsetX: number, offsetY: number): Array<{ x: number; y: number; pressure?: number }> {
  const points: Array<{ x: number; y: number; pressure?: number }> = [];
  
  try {
    // Remove whitespace and normalize
    const normalized = svgPath.replace(/\s+/g, ' ').trim();
    
    // Split into commands (M, L, C, Q, Z, etc.)
    const commandRegex = /([MLCZQ][^MLCZQ]*)/gi;
    const commands = normalized.match(commandRegex) || [];
    
    let currentX = offsetX;
    let currentY = offsetY;
    
    for (const cmd of commands) {
      const commandType = cmd[0].toUpperCase();
      const coords = cmd.slice(1).trim().match(/[\d.-]+/g) || [];
      
      if (commandType === 'M') {
        // Move to - start new path
        if (coords.length >= 2) {
          currentX = parseFloat(coords[0]) + offsetX;
          currentY = parseFloat(coords[1]) + offsetY;
          if (!isNaN(currentX) && !isNaN(currentY)) {
            points.push({ x: currentX, y: currentY, pressure: 0.5 });
          }
        }
      } else if (commandType === 'L') {
        // Line to
        if (coords.length >= 2) {
          currentX = parseFloat(coords[0]) + offsetX;
          currentY = parseFloat(coords[1]) + offsetY;
          if (!isNaN(currentX) && !isNaN(currentY)) {
            points.push({ x: currentX, y: currentY, pressure: 0.5 });
          }
        }
      } else if (commandType === 'C') {
        // Cubic bezier - sample points along the curve for better accuracy
        if (coords.length >= 6) {
          const x1 = parseFloat(coords[0]) + offsetX;
          const y1 = parseFloat(coords[1]) + offsetY;
          const x2 = parseFloat(coords[2]) + offsetX;
          const y2 = parseFloat(coords[3]) + offsetY;
          const x3 = parseFloat(coords[4]) + offsetX;
          const y3 = parseFloat(coords[5]) + offsetY;
          
          // Sample points along the bezier curve
          for (let t = 0.1; t <= 1; t += 0.1) {
            const mt = 1 - t;
            const x = mt * mt * mt * currentX + 3 * mt * mt * t * x1 + 3 * mt * t * t * x2 + t * t * t * x3;
            const y = mt * mt * mt * currentY + 3 * mt * mt * t * y1 + 3 * mt * t * t * y2 + t * t * t * y3;
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y, pressure: 0.5 });
            }
          }
          currentX = x3;
          currentY = y3;
        }
      } else if (commandType === 'Q') {
        // Quadratic bezier - sample points along the curve
        if (coords.length >= 4) {
          const x1 = parseFloat(coords[0]) + offsetX;
          const y1 = parseFloat(coords[1]) + offsetY;
          const x2 = parseFloat(coords[2]) + offsetX;
          const y2 = parseFloat(coords[3]) + offsetY;
          
          // Sample points along the bezier curve
          for (let t = 0.1; t <= 1; t += 0.1) {
            const mt = 1 - t;
            const x = mt * mt * currentX + 2 * mt * t * x1 + t * t * x2;
            const y = mt * mt * currentY + 2 * mt * t * y1 + t * t * y2;
            if (!isNaN(x) && !isNaN(y)) {
              points.push({ x, y, pressure: 0.5 });
            }
          }
          currentX = x2;
          currentY = y2;
        }
      } else if (commandType === 'Z') {
        // Close path - connect back to start
        if (points.length > 0) {
          // Add the first point again to close the path
          points.push({ ...points[0] });
        }
      }
    }
    
    // If we got no points, try a simpler approach - just extract all number pairs
    if (points.length === 0) {
      const allNumbers = normalized.match(/[\d.-]+/g) || [];
      for (let i = 0; i < allNumbers.length; i += 2) {
        if (i + 1 < allNumbers.length) {
          const x = parseFloat(allNumbers[i]) + offsetX;
          const y = parseFloat(allNumbers[i + 1]) + offsetY;
          if (!isNaN(x) && !isNaN(y)) {
            points.push({ x, y, pressure: 0.5 });
          }
        }
      }
    }
  } catch (error) {
    console.error('Error parsing SVG path:', error);
  }
  
  return points;
}

