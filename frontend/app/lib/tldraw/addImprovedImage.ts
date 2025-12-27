import type { Editor } from 'tldraw';
import type { TLAsset, TLAssetId, TLShapeId } from 'tldraw';
import { createShapeId } from 'tldraw';

// Helper to create asset ID (similar to createShapeId)
function createAssetId(): TLAssetId {
  return `asset:${Math.random().toString(36).slice(2, 11)}` as TLAssetId;
}

/**
 * Adds the improved PNG image to the tldraw canvas as an image asset
 * @param editor - The tldraw editor instance
 * @param imageBase64 - The improved image as base64-encoded PNG string (without data URL prefix)
 * @param originalShapeId - Optional ID of the original shape to replace or position near
 */
export function addImprovedImageToCanvas(
  editor: Editor,
  imageBase64: string,
  originalShapeId?: string
): void {
  try {
    console.log('[addImprovedImage] Starting, imageBase64 length:', imageBase64.length);
    
    // Convert base64 to data URL
    const dataUrl = `data:image/png;base64,${imageBase64}`;
    console.log('[addImprovedImage] Created data URL');
    
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
    
    console.log('[addImprovedImage] Position:', { x, y });
    
    // Preload the image to get actual dimensions
    const img = new Image();
    img.crossOrigin = 'anonymous'; // Avoid CORS issues
    
    img.onload = () => {
      console.log('[addImprovedImage] Image loaded successfully');
      console.log('[addImprovedImage] Image dimensions:', img.width, img.height);
      console.log('[addImprovedImage] Image natural dimensions:', img.naturalWidth, img.naturalHeight);
      
      // Use actual image dimensions
      const finalWidth = (img.naturalWidth > 0 ? img.naturalWidth : img.width) || 200;
      const finalHeight = (img.naturalHeight > 0 ? img.naturalHeight : img.height) || 200;
      
      console.log('[addImprovedImage] Final dimensions:', { finalWidth, finalHeight });
      
      // Create an asset ID
      const assetId = createAssetId();
      console.log('[addImprovedImage] Created asset ID:', assetId);
      
      // Create the asset record
      const asset: TLAsset = {
        id: assetId,
        typeName: 'asset',
        type: 'image',
        props: {
          w: finalWidth,
          h: finalHeight,
          name: 'improved-sketch.png',
          mimeType: 'image/png',
          src: dataUrl,
          isAnimated: false,
        },
        meta: {},
      };
      
      console.log('[addImprovedImage] Asset record created:', {
        id: asset.id,
        type: asset.type,
        props: asset.props,
      });
      
      // Create asset and shape
      try {
        const imageShapeId = createShapeId();
        
        console.log('[addImprovedImage] Creating asset and shape...');
        
        // Add asset to store
        editor.store.put([asset]);
        console.log('[addImprovedImage] Asset added to store');
        
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
        console.log('[addImprovedImage] Shape created');
        
        // Verify after batch completes
        setTimeout(() => {
          // Verify asset was added
          const addedAsset = editor.store.get(assetId);
          if (!addedAsset) {
            console.error('[addImprovedImage] ❌ Asset not found in store after batch!');
            console.error('[addImprovedImage] Store records count:', editor.store.allRecords().length);
            console.error('[addImprovedImage] All asset IDs:', Array.from(editor.store.allRecords())
              .filter(r => r.typeName === 'asset')
              .map(r => ({ id: r.id, type: (r as any).type })));
            return;
          }
          
          console.log('[addImprovedImage] ✅ Asset verified in store:', addedAsset.id);
          console.log('[addImprovedImage] Asset props:', (addedAsset as any).props);
          
          // Verify shape was created
          const createdShape = editor.getShape(imageShapeId);
          if (createdShape) {
            console.log('[addImprovedImage] ✅ Shape created and verified!');
            console.log('[addImprovedImage] Shape details:', {
              id: createdShape.id,
              type: createdShape.type,
              props: (createdShape as any).props,
            });
            
            // Select the new shape
            editor.setSelectedShapes([imageShapeId]);
            console.log('[addImprovedImage] ✅ Shape selected');
            console.log('[addImprovedImage] ✅ SUCCESS! Image should be visible on canvas.');
            
            // Zoom to fit the new shape
            try {
              editor.zoomToFit();
            } catch (zoomError) {
              console.warn('[addImprovedImage] Could not zoom to fit:', zoomError);
            }
          } else {
            console.error('[addImprovedImage] ❌ Shape not found after creation!');
            console.error('[addImprovedImage] Available shapes on page:', editor.getCurrentPageShapes().map(s => ({
              id: s.id,
              type: s.type,
            })));
          }
        }, 50);
        
      } catch (batchError) {
        console.error('[addImprovedImage] ❌ Error in batch operation:', batchError);
        if (batchError instanceof Error) {
          console.error('[addImprovedImage] Batch error message:', batchError.message);
          console.error('[addImprovedImage] Batch error stack:', batchError.stack);
        }
        return;
      }
    };
    
    img.onerror = (error) => {
      console.error('[addImprovedImage] ❌ Failed to load image:', error);
      console.error('[addImprovedImage] Image src preview:', dataUrl.substring(0, 100));
    };
    
    img.src = dataUrl;
    console.log('[addImprovedImage] Started image preload');
    
  } catch (error) {
    console.error('[addImprovedImage] ❌ Fatal error:', error);
    if (error instanceof Error) {
      console.error('[addImprovedImage] Error message:', error.message);
      console.error('[addImprovedImage] Error stack:', error.stack);
    }
  }
}

