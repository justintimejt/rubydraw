import type { Editor } from 'tldraw';
import type { TLAsset, TLAssetId, TLShapeId } from 'tldraw';
import { createShapeId } from 'tldraw';

// Helper to create asset ID (similar to createShapeId)
function createAssetId(): TLAssetId {
  return `asset:${Math.random().toString(36).slice(2, 11)}` as TLAssetId;
}

/**
 * Adds the improved SVG to the tldraw canvas as an SVG asset/image
 * This preserves curves, fills, colours, and styling from the displaySvg
 * @param editor - The tldraw editor instance
 * @param displaySvg - The complete styled SVG string for 2D display
 * @param originalShapeId - Optional ID of the original shape to replace or position near
 */
export function addImprovedShapeToCanvas(
  editor: Editor,
  displaySvg: string,
  originalShapeId?: string
): void {
  try {
    // Get the original shape's position if provided
    let x = 100;
    let y = 100;
    
    if (originalShapeId) {
      const originalShape = editor.getShape(originalShapeId as TLShapeId);
      if (originalShape) {
        const bounds = editor.getShapeGeometry(originalShape).bounds;
        x = bounds.x + bounds.w + 50; // Position to the right of original
        y = bounds.y;
      }
    }

    // Extract viewBox from SVG to get dimensions
    const viewBoxMatch = displaySvg.match(/viewBox=["']([^"']+)["']/i);
    const widthMatch = displaySvg.match(/width=["']([^"']+)["']/i);
    const heightMatch = displaySvg.match(/height=["']([^"']+)["']/i);
    
    let svgWidth = 200;
    let svgHeight = 200;
    
    if (viewBoxMatch) {
      const [, viewBox] = viewBoxMatch;
      const parts = viewBox.split(/\s+/);
      if (parts.length >= 4) {
        svgWidth = parseFloat(parts[2]) || 200;
        svgHeight = parseFloat(parts[3]) || 200;
      }
    } else if (widthMatch && heightMatch) {
      svgWidth = parseFloat(widthMatch[1]) || 200;
      svgHeight = parseFloat(heightMatch[1]) || 200;
    }
    
    console.log('[addImprovedShape] Starting, displaySvg length:', displaySvg.length);
    console.log('[addImprovedShape] Position:', { x, y });
    console.log('[addImprovedShape] Dimensions:', { svgWidth, svgHeight });
    
    // Convert SVG to data URL
    const svgBlob = new Blob([displaySvg], { type: 'image/svg+xml;charset=utf-8' });
    const dataUrl = URL.createObjectURL(svgBlob);
    console.log('[addImprovedShape] Created data URL:', dataUrl.substring(0, 50) + '...');
    
    // Create an asset ID
    const assetId = createAssetId();
    console.log('[addImprovedShape] Created asset ID:', assetId);
    
    // Create the asset record
    const asset: TLAsset = {
      id: assetId,
      typeName: 'asset',
      type: 'image',
      props: {
        w: svgWidth,
        h: svgHeight,
        name: 'improved-sketch.svg',
        mimeType: 'image/svg+xml',
        src: dataUrl,
        isAnimated: false,
      },
      meta: {},
    };
    
    console.log('[addImprovedShape] Asset record:', asset);
    
    // Add asset to store
    try {
      editor.store.put([asset]);
      console.log('[addImprovedShape] Asset added to store successfully');
    } catch (storeError) {
      console.error('[addImprovedShape] Error adding asset to store:', storeError);
      throw storeError;
    }
    
    // Verify asset was added
    const addedAsset = editor.store.get(assetId);
    if (!addedAsset) {
      console.error('[addImprovedShape] Asset was not found in store after adding!');
      throw new Error('Failed to add asset to store');
    }
    console.log('[addImprovedShape] Verified asset in store:', addedAsset.id);
    
    // Create image shape that references the asset
    const imageShapeId = createShapeId();
    console.log('[addImprovedShape] Creating image shape with ID:', imageShapeId);
    
    try {
      editor.createShape({
        id: imageShapeId,
        type: 'image',
        x,
        y,
        props: {
          w: svgWidth,
          h: svgHeight,
          assetId: assetId,
        },
      });
      console.log('[addImprovedShape] Image shape created successfully');
    } catch (shapeError) {
      console.error('[addImprovedShape] Error creating image shape:', shapeError);
      throw shapeError;
    }
    
    // Verify shape was created
    const createdShape = editor.getShape(imageShapeId);
    if (!createdShape) {
      console.error('[addImprovedShape] Shape was not found after creation!');
      throw new Error('Failed to create image shape');
    }
    console.log('[addImprovedShape] Verified shape in editor:', createdShape.id, createdShape.type);
    
    // Select the new shape
    try {
      editor.setSelectedShapes([imageShapeId]);
      console.log('[addImprovedShape] Shape selected');
    } catch (selectError) {
      console.warn('[addImprovedShape] Error selecting shape:', selectError);
    }
    
    // Don't revoke the blob URL - tldraw needs it to render the image
    // The browser will clean it up when the page is closed
    console.log('[addImprovedShape] Complete! Asset:', assetId, 'Shape:', imageShapeId);
  } catch (error) {
    console.error('Error adding improved shape to canvas:', error);
  }
}


