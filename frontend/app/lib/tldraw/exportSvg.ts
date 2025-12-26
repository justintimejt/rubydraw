import type { Editor } from 'tldraw';

export async function exportSelectedShapesAsSvg(editor: Editor): Promise<string | null> {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) {
    return null;
  }
  
  try {
    const editorAny = editor as any;
    
    // In tldraw v4, getSvgString returns an object with { svg: string, width: number, height: number }
    if (typeof editorAny.getSvgString === 'function') {
      const result = await editorAny.getSvgString(selectedIds);
      
      // Check if result has a 'svg' property (the actual SVG string)
      if (result && typeof result.svg === 'string' && result.svg.length > 0) {
        return result.svg;
      }
      
      // If result is already a string (fallback)
      if (typeof result === 'string' && result.length > 0) {
        return result;
      }
    }
    
    // Fallback: try getSvg if it exists (returns SVGElement)
    if (typeof editorAny.getSvg === 'function') {
      const svgElement = await editorAny.getSvg(selectedIds);
      if (svgElement) {
        if (typeof svgElement.outerHTML === 'string') {
          return svgElement.outerHTML;
        }
        if (svgElement instanceof SVGElement || svgElement instanceof Element) {
          return new XMLSerializer().serializeToString(svgElement);
        }
      }
    }
    
    console.error('tldraw SVG export methods not found or returned invalid data');
    return null;
  } catch (error) {
    console.error('Error exporting SVG from tldraw:', error);
    return null;
  }
}

