# Improve Sketch Feature - Implementation Requirements

This document outlines all missing requirements to fully implement the "Improve Sketch" feature that allows users to draw rough sketches in tldraw, send them to Gemini for cleaning, and preview them as 3D extruded models.

## Current Status

### ✅ Backend (Complete)
- [x] GeminiService class with API integration
- [x] GraphQL mutation `improveSketch`
- [x] GraphQL type `ImproveSketchResultType`
- [x] Environment variable configuration (GEMINI_API_KEY)
- [x] Error handling and logging

### ⚠️ Frontend (Partial)
- [x] Prompt builder utility (`improveSketchPrompt.ts`)
- [x] TypeScript types for Gemini response
- [x] Basic tldraw board integration
- [x] Three.js preview component
- [ ] GraphQL client setup
- [ ] SVG export from tldraw
- [ ] UI controls for improve sketch action
- [ ] Integration with backend mutation
- [ ] SVG path to 3D geometry conversion
- [ ] Error handling and loading states

---

## Backend Requirements

### 1. Verify API Endpoint & Model Name
**Status:** Needs verification

The current implementation uses:
- Model: `gemini-2.0-flash-exp`
- Endpoint: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent`

**Action Items:**
- [ ] Verify the correct model name for Gemini 2.5 Flash (as mentioned in prompt doc)
- [ ] Test API endpoint with actual API key
- [ ] Update model name if needed in `GeminiService::API_BASE_URL`

### 2. Error Handling Enhancements
**Status:** Basic implementation exists

**Action Items:**
- [ ] Add rate limiting handling
- [ ] Add retry logic for transient failures
- [ ] Add request timeout handling
- [ ] Improve error messages for different failure scenarios

### 3. Authentication (Optional for MVP)
**Status:** Currently commented out

**Action Items:**
- [ ] Decide if authentication is needed for MVP
- [ ] If yes, uncomment and implement user authentication in `ImproveSketch` mutation
- [ ] Add rate limiting per user if needed

### 4. Logging & Monitoring
**Status:** Basic logging exists

**Action Items:**
- [ ] Add structured logging for API calls
- [ ] Log request/response sizes for monitoring
- [ ] Add metrics for API call duration
- [ ] Consider adding request/response caching for debugging

---

## Frontend Requirements

### 1. GraphQL Client Setup
**Status:** Not implemented

**Required:**
- [ ] Install GraphQL client library (recommend `@apollo/client` or `graphql-request`)
- [ ] Configure GraphQL endpoint URL (likely `http://localhost:3000/graphql` for dev)
- [ ] Set up client in app root or context
- [ ] Create GraphQL query/mutation hooks or utilities

**Files to create/modify:**
- `app/lib/graphql/client.ts` - GraphQL client configuration
- `app/lib/graphql/mutations.ts` - Mutation definitions
- `app/lib/graphql/queries.ts` - Query definitions (if needed)

**Example structure:**
```typescript
// app/lib/graphql/client.ts
import { GraphQLClient } from 'graphql-request';

const endpoint = import.meta.env.VITE_GRAPHQL_ENDPOINT || 'http://localhost:3000/graphql';

export const graphqlClient = new GraphQLClient(endpoint);

// app/lib/graphql/mutations.ts
import { graphqlClient } from './client';
import type { GeminiSketchResponse } from '../gemini/improveSketchPrompt';

const IMPROVE_SKETCH_MUTATION = `
  mutation ImproveSketch($svg: String!, $hints: String) {
    improveSketch(svg: $svg, hints: $hints) {
      result {
        cleanSvgPath
        isClosed
        suggestedDepth
        suggestedBevel
        notes
      }
      errors
    }
  }
`;

export async function improveSketch(svg: string, hints?: string) {
  const data = await graphqlClient.request<{
    improveSketch: {
      result: GeminiSketchResponse | null;
      errors: string[];
    };
  }>(IMPROVE_SKETCH_MUTATION, { svg, hints });
  return data.improveSketch;
}
```

### 2. SVG Export from tldraw
**Status:** Not implemented

**Required:**
- [ ] Export selected shapes from tldraw as SVG
- [ ] Handle multiple selected shapes (merge or use first)
- [ ] Extract SVG string from tldraw's export functionality

**Files to create/modify:**
- `app/lib/tldraw/exportSvg.ts` - SVG export utility

**Implementation notes:**
- tldraw has built-in SVG export: `editor.getSvgString(shapeIds)`
- Need to handle edge cases (no selection, multiple selections)
- May need to extract just the path data or full SVG

**Example:**
```typescript
// app/lib/tldraw/exportSvg.ts
import type { Editor } from 'tldraw';

export function exportSelectedShapesAsSvg(editor: Editor): string | null {
  const selectedIds = editor.getSelectedShapeIds();
  if (selectedIds.length === 0) return null;
  
  // Get SVG string from tldraw
  const svgString = editor.getSvgString(selectedIds);
  return svgString;
}
```

### 3. UI Controls for Improve Sketch
**Status:** Not implemented

**Required:**
- [ ] Add button/action in the board UI to trigger "Improve Sketch"
- [ ] Show loading state during API call
- [ ] Display error messages if improvement fails
- [ ] Show success feedback (maybe show notes from Gemini)
- [ ] Optionally allow user to add hints before improving

**Files to modify:**
- `app/routes/b.$boardId.tsx` - Add improve sketch button
- `app/components/ImproveSketchButton.tsx` - New component (optional)

**UI Requirements:**
- Button should be disabled when no shape is selected
- Show loading spinner during API call
- Display error toast/alert on failure
- Optionally show a modal with hints input

### 4. Integration with Backend Mutation
**Status:** Not implemented

**Required:**
- [ ] Call GraphQL mutation when user clicks "Improve Sketch"
- [ ] Pass SVG string and optional hints
- [ ] Handle response (success/error)
- [ ] Update UI state based on response

**Files to modify:**
- `app/routes/b.$boardId.tsx` - Add mutation call logic

**Flow:**
1. User selects shape(s) in tldraw
2. User clicks "Improve Sketch" button
3. Export SVG from selected shapes
4. Call `improveSketch` GraphQL mutation
5. Handle response:
   - Success: Use `cleanSvgPath` to create 3D geometry
   - Error: Display error message

### 5. SVG Path to 3D Geometry Conversion
**Status:** Not implemented (currently only handles simple shapes)

**Required:**
- [ ] Install `three-stdlib` or use Three.js SVGLoader
- [ ] Parse cleaned SVG path from Gemini response
- [ ] Convert SVG path to THREE.Shape
- [ ] Extrude shape using suggested depth and bevel
- [ ] Update geometry in Three.js preview

**Files to create/modify:**
- `app/lib/three/svgToGeometry.ts` - SVG to 3D conversion
- `app/lib/tldraw/toGeometry.ts` - Update to handle SVG paths

**Dependencies to add:**
```json
{
  "three-stdlib": "^2.x.x" // or use three/examples/jsm/loaders/SVGLoader
}
```

**Implementation:**
```typescript
// app/lib/three/svgToGeometry.ts
import * as THREE from 'three';
import { SVGLoader } from 'three-stdlib/loaders/SVGLoader'; // or three/examples/jsm/loaders/SVGLoader

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
```

### 6. Update Geometry Conversion Logic
**Status:** Partially implemented (only handles simple shapes)

**Required:**
- [ ] Update `toExtrudedGeometryFromShape` to handle improved sketches
- [ ] Store improved sketch data (cleanSvgPath, etc.) in component state
- [ ] Use improved geometry when available, fallback to simple shape conversion

**Files to modify:**
- `app/routes/b.$boardId.tsx` - Add state for improved sketch data
- `app/lib/tldraw/toGeometry.ts` - Add function to handle SVG paths

**State management:**
- Store `GeminiSketchResponse` in component state
- When improved sketch exists, use it for 3D preview
- When shape changes or new selection, clear improved sketch

### 7. Error Handling & Loading States
**Status:** Not implemented

**Required:**
- [ ] Loading state during API call
- [ ] Error display (toast, alert, or inline message)
- [ ] Retry mechanism (optional)
- [ ] Handle network errors gracefully
- [ ] Validate SVG before sending

**UI States:**
- Idle: Button enabled when shape selected
- Loading: Button disabled, show spinner
- Success: Show improved geometry, optionally show notes
- Error: Show error message, allow retry

### 8. Environment Configuration
**Status:** Not implemented

**Required:**
- [ ] Add GraphQL endpoint to environment variables
- [ ] Create `.env.example` file
- [ ] Document required environment variables

**Files to create/modify:**
- `frontend/.env.example`
- `frontend/README.md` - Update with env vars

**Environment variables:**
```bash
VITE_GRAPHQL_ENDPOINT=http://localhost:3000/graphql
```

---

## Integration Flow

### Complete User Flow

1. **User draws sketch in tldraw**
   - Uses draw tool or any shape tool
   - Creates rough sketch

2. **User selects shape(s)**
   - Clicks on drawn shape(s)
   - Selection is highlighted

3. **User clicks "Improve Sketch" button**
   - Button is enabled when shape(s) selected
   - Button shows loading state

4. **Frontend exports SVG**
   - Calls `exportSelectedShapesAsSvg(editor)`
   - Gets SVG string from tldraw

5. **Frontend calls GraphQL mutation**
   - Calls `improveSketch(svg, hints?)`
   - Sends request to backend

6. **Backend processes request**
   - GeminiService calls Gemini API
   - Returns cleaned SVG path and metadata

7. **Frontend receives response**
   - Gets `cleanSvgPath`, `suggestedDepth`, `suggestedBevel`, etc.
   - Stores in component state

8. **Frontend converts to 3D**
   - Calls `extrudeSvgPath(cleanSvgPath, depth, bevel)`
   - Creates THREE.ExtrudeGeometry

9. **Frontend displays 3D preview**
   - Updates ThreePreview component with new geometry
   - User sees cleaned, extruded 3D model

---

## Testing Requirements

### Backend Tests
- [ ] Test GeminiService with mock API responses
- [ ] Test GraphQL mutation with valid/invalid inputs
- [ ] Test error handling scenarios
- [ ] Test with actual Gemini API (integration test)

### Frontend Tests
- [ ] Test SVG export from tldraw
- [ ] Test GraphQL mutation call
- [ ] Test SVG to 3D conversion
- [ ] Test UI states (loading, error, success)
- [ ] Test with various sketch types (circles, blobs, complex shapes)

### End-to-End Tests
- [ ] Test complete flow: draw → improve → preview
- [ ] Test error scenarios (network failure, invalid SVG)
- [ ] Test with different sketch complexities

---

## Dependencies to Add

### Frontend
```json
{
  "dependencies": {
    "@apollo/client": "^3.x.x",  // or "graphql-request": "^6.x.x"
    "three-stdlib": "^2.x.x"      // or use three/examples/jsm/loaders/SVGLoader
  }
}
```

### Backend
Already have:
- `faraday` - HTTP client
- `dotenv-rails` - Environment variables

---

## Priority Order

### Phase 1: Core Functionality (MVP)
1. GraphQL client setup
2. SVG export from tldraw
3. Backend mutation integration
4. SVG to 3D conversion
5. Basic UI button

### Phase 2: Polish
6. Loading states
7. Error handling
8. Hints input (optional)
9. Success feedback

### Phase 3: Enhancements
10. Multiple shape handling
11. Caching improved sketches
12. Undo/redo for improvements
13. Export improved geometry

---

## Notes

- The backend is production-ready and just needs testing
- The frontend has the foundation (tldraw, Three.js) but needs integration
- Consider adding a "Reset" button to clear improved sketch and go back to original
- May want to add a toggle to switch between original and improved geometry
- Consider adding a preview of the cleaned SVG path (2D) before 3D extrusion

