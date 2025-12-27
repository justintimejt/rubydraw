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
/**
 * Ensures SVG has explicit width, height, and xmlns attributes for proper rendering
 */
function ensureSvgDimensions(svg: string): string {
  let processedSvg = svg;
  
  // Ensure xmlns is present
  if (!/xmlns=["']http:\/\/www\.w3\.org\/2000\/svg["']/i.test(processedSvg)) {
    processedSvg = processedSvg.replace(
      /<svg([^>]*)>/i,
      `<svg$1 xmlns="http://www.w3.org/2000/svg">`
    );
  }
  
  // Check if SVG already has width and height
  const hasWidth = /width=["']/i.test(processedSvg);
  const hasHeight = /height=["']/i.test(processedSvg);
  
  if (hasWidth && hasHeight) {
    return processedSvg; // Already has dimensions
  }
  
  // Extract viewBox
  const viewBoxMatch = processedSvg.match(/viewBox=["']([^"']+)["']/i);
  let width = 200;
  let height = 200;
  
  if (viewBoxMatch) {
    const [, viewBox] = viewBoxMatch;
    const parts = viewBox.split(/\s+/);
    if (parts.length >= 4) {
      width = parseFloat(parts[2]) || 200;
      height = parseFloat(parts[3]) || 200;
    }
  }
  
  // Add width and height to SVG tag
  if (!hasWidth || !hasHeight) {
    processedSvg = processedSvg.replace(
      /<svg([^>]*)>/i,
      `<svg$1 width="${width}" height="${height}">`
    );
  }
  
  return processedSvg;
}

export function addImprovedShapeToCanvas(
  editor: Editor,
  displaySvg: string,
  originalShapeId?: string
): void {
  try {
    console.log('[addImprovedShape] Starting, displaySvg length:', displaySvg.length);
    console.log('[addImprovedShape] displaySvg preview:', displaySvg.substring(0, 200));
    
    // Ensure SVG has explicit dimensions
    const svgWithDimensions = ensureSvgDimensions(displaySvg);
    
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

    // Extract dimensions from SVG
    const viewBoxMatch = svgWithDimensions.match(/viewBox=["']([^"']+)["']/i);
    const widthMatch = svgWithDimensions.match(/width=["']([^"']+)["']/i);
    const heightMatch = svgWithDimensions.match(/height=["']([^"']+)["']/i);
    
    let svgWidth = 200;
    let svgHeight = 200;
    
    if (widthMatch && heightMatch) {
      svgWidth = parseFloat(widthMatch[1]) || 200;
      svgHeight = parseFloat(heightMatch[1]) || 200;
    } else if (viewBoxMatch) {
      const [, viewBox] = viewBoxMatch;
      const parts = viewBox.split(/\s+/);
      if (parts.length >= 4) {
        svgWidth = parseFloat(parts[2]) || 200;
        svgHeight = parseFloat(parts[3]) || 200;
      }
    }
    
    console.log('[addImprovedShape] Position:', { x, y });
    console.log('[addImprovedShape] Dimensions:', { svgWidth, svgHeight });
    
    // Convert SVG to base64 data URL for better compatibility
    const svgBase64 = btoa(unescape(encodeURIComponent(svgWithDimensions)));
    const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
    console.log('[addImprovedShape] Created base64 data URL, length:', dataUrl.length);
    
    // Preload the image to ensure it's ready and get actual dimensions
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid CORS issues
    
    img.onload = () => {
      console.log('[addImprovedShape] Image loaded successfully');
      console.log('[addImprovedShape] Image dimensions:', img.width, img.height);
      console.log('[addImprovedShape] Image natural dimensions:', img.naturalWidth, img.naturalHeight);
      
      // Use actual image dimensions, but ensure they're reasonable
      const finalWidth = (img.naturalWidth > 0 ? img.naturalWidth : img.width) || svgWidth;
      const finalHeight = (img.naturalHeight > 0 ? img.naturalHeight : img.height) || svgHeight;
      
      console.log('[addImprovedShape] Final dimensions:', { finalWidth, finalHeight });
      
      // Create an asset ID
      const assetId = createAssetId();
      console.log('[addImprovedShape] Created asset ID:', assetId);
      
      // Create the asset record
      const asset: TLAsset = {
        id: assetId,
        typeName: 'asset',
        type: 'image',
        props: {
          w: finalWidth,
          h: finalHeight,
          name: 'improved-sketch.svg',
          mimeType: 'image/svg+xml',
          src: dataUrl,
          isAnimated: false,
        },
        meta: {},
      };
      
      console.log('[addImprovedShape] Asset record created:', {
        id: asset.id,
        type: asset.type,
        props: asset.props,
      });
      
      // Use editor.batch to create asset and shape atomically
      try {
        const imageShapeId = createShapeId();
        
        console.log('[addImprovedShape] Creating asset and shape in batch...');
        
        // Use batch to ensure atomic creation
        editor.batch(() => {
          // Add asset to store
          editor.store.put([asset]);
          console.log('[addImprovedShape] Asset added to store');
          
          // Create image shape immediately after
          editor.createShape({
            id: imageShapeId,
            type: 'image',
            x,
            y,
            props: {
              w: finalWidth,
              h: finalHeight,
              assetId: assetId,
            },
          });
          console.log('[addImprovedShape] Shape created in batch');
        });
        
        // Verify after batch completes
        setTimeout(() => {
          // Verify asset was added
          const addedAsset = editor.store.get(assetId);
          if (!addedAsset) {
            console.error('[addImprovedShape] ❌ Asset not found in store after batch!');
            console.error('[addImprovedShape] Store records count:', editor.store.allRecords().length);
            console.error('[addImprovedShape] All asset IDs:', Array.from(editor.store.allRecords())
              .filter(r => r.typeName === 'asset')
              .map(r => ({ id: r.id, type: (r as any).type })));
            return;
          }
          
          console.log('[addImprovedShape] ✅ Asset verified in store:', addedAsset.id);
          console.log('[addImprovedShape] Asset props:', (addedAsset as any).props);
          
          // Verify shape was created
          const createdShape = editor.getShape(imageShapeId);
          if (createdShape) {
            console.log('[addImprovedShape] ✅ Shape created and verified!');
            console.log('[addImprovedShape] Shape details:', {
              id: createdShape.id,
              type: createdShape.type,
              props: (createdShape as any).props,
            });
            
            // Select the new shape
            editor.setSelectedShapes([imageShapeId]);
            console.log('[addImprovedShape] ✅ Shape selected');
            console.log('[addImprovedShape] ✅ SUCCESS! Image should be visible on canvas.');
            
            // Zoom to fit the new shape
            try {
              editor.zoomToFit();
            } catch (zoomError) {
              console.warn('[addImprovedShape] Could not zoom to fit:', zoomError);
            }
          } else {
            console.error('[addImprovedShape] ❌ Shape not found after creation!');
            console.error('[addImprovedShape] Available shapes on page:', editor.getCurrentPageShapes().map(s => ({
              id: s.id,
              type: s.type,
            })));
          }
        }, 50);
        
      } catch (batchError) {
        console.error('[addImprovedShape] ❌ Error in batch operation:', batchError);
        if (batchError instanceof Error) {
          console.error('[addImprovedShape] Batch error message:', batchError.message);
          console.error('[addImprovedShape] Batch error stack:', batchError.stack);
        }
        return;
      }
    };
    
    img.onerror = (error) => {
      console.error('[addImprovedShape] ❌ Failed to load image:', error);
      console.error('[addImprovedShape] Image src preview:', dataUrl.substring(0, 100));
      console.error('[addImprovedShape] SVG content preview:', svgWithDimensions.substring(0, 200));
    };
    
    img.src = dataUrl;
    console.log('[addImprovedShape] Started image preload');
    
  } catch (error) {
    console.error('[addImprovedShape] ❌ Fatal error:', error);
    if (error instanceof Error) {
      console.error('[addImprovedShape] Error message:', error.message);
      console.error('[addImprovedShape] Error stack:', error.stack);
    }
  }
}


