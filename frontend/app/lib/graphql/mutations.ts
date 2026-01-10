import { graphqlClient } from './client';

const IMPROVE_SKETCH_MUTATION = `
  mutation ImproveSketch($input: ImproveSketchInput!) {
    improveSketch(input: $input) {
      result {
        imageBase64
        title
        style
        palette
        background
        notes
      }
      errors
    }
  }
`;

export async function improveSketch(pngBase64: string, svg?: string, hints?: string) {
  // Validate pngBase64 is actually a string
  if (typeof pngBase64 !== 'string') {
    console.error('improveSketch called with non-string pngBase64:', typeof pngBase64);
    throw new Error(`PNG base64 must be a string, got ${typeof pngBase64}`);
  }
  
  if (!pngBase64 || pngBase64.trim().length === 0) {
    throw new Error('PNG base64 string is empty');
  }
  
  try {
    const data = await graphqlClient.request<{
      improveSketch: {
        result: {
          imageBase64: string;
          title: string;
          style: string;
          palette: string[];
          background: string;
          notes: string;
        } | null;
        errors: string[];
      };
    }>(IMPROVE_SKETCH_MUTATION, { 
      input: {
        pngBase64: String(pngBase64), // Ensure it's a string
        svg: svg ? String(svg) : null,
        hints: hints ? String(hints) : null
      }
    });
    return data.improveSketch;
  } catch (error) {
    // Log error message only, not full error object (may contain sensitive data)
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("GraphQL request error:", errorMessage);
    throw error;
  }
}


