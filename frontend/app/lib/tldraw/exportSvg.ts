import type { Editor } from 'tldraw';

export function exportSelectedShapesAsSvg(editor: Editor): string | null {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) return null;
  
  // Get SVG string from tldraw
  const svgString = editor.getSvgString(selectedIds);
  return svgString;
}

