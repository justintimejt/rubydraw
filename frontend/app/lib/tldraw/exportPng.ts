import type { Editor } from 'tldraw';

/**
 * Exports selected tldraw shapes as a PNG image (base64)
 * @param editor - The tldraw editor instance
 * @returns Base64-encoded PNG string, or null if export fails
 */
export async function exportSelectedShapesAsPng(editor: Editor): Promise<string | null> {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) {
    return null;
  }
  
  try {
    const editorAny = editor as any;
    
    // Try to get SVG first, then convert to PNG
    let svgString: string | null = null;
    
    // In tldraw v4, getSvgString returns an object with { svg: string, width: number, height: number }
    if (typeof editorAny.getSvgString === 'function') {
      const result = await editorAny.getSvgString(selectedIds);
      console.log('getSvgString result:', result, 'type:', typeof result);
      
      // Check if result has a 'svg' property (the actual SVG string)
      if (result && typeof result.svg === 'string' && result.svg.length > 0) {
        svgString = result.svg;
      } else if (typeof result === 'string' && result.length > 0) {
        svgString = result;
      }
    }
    
    // Fallback: try getSvg if it exists
    if (!svgString && typeof editorAny.getSvg === 'function') {
      const svgElement = await editorAny.getSvg(selectedIds);
      if (svgElement) {
        if (typeof svgElement.outerHTML === 'string') {
          svgString = svgElement.outerHTML;
        } else if (svgElement instanceof SVGElement || svgElement instanceof Element) {
          svgString = new XMLSerializer().serializeToString(svgElement);
        }
      }
    }
    
    if (!svgString) {
      console.error('tldraw SVG export methods not found or returned invalid data');
      return null;
    }
    
    // Convert SVG to PNG using canvas
    return await svgToPngBase64(svgString);
  } catch (error) {
    // Log error message only, not full error object (may contain sensitive data)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error exporting PNG from tldraw:', errorMessage);
    return null;
  }
}

/**
 * Converts SVG string to base64-encoded PNG
 */
async function svgToPngBase64(svgString: string): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // Create an image element to load the SVG
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        try {
          // Create a canvas and draw the image
          const canvas = document.createElement('canvas');
          canvas.width = img.width || img.naturalWidth || 800;
          canvas.height = img.height || img.naturalHeight || 600;
          
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            reject(new Error('Could not get canvas context'));
            return;
          }
          
          // Use transparent background (don't fill with white)
          // This preserves transparency from the SVG
          
          // Draw the SVG image
          ctx.drawImage(img, 0, 0);
          
          // Convert to base64 PNG
          const pngBase64 = canvas.toDataURL('image/png').split(',')[1]; // Remove data:image/png;base64, prefix
          
          URL.revokeObjectURL(url);
          resolve(pngBase64);
        } catch (error) {
          URL.revokeObjectURL(url);
          reject(error);
        }
      };
      
      img.onerror = (error) => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load SVG image'));
      };
      
      img.src = url;
    } catch (error) {
      reject(error);
    }
  });
}

