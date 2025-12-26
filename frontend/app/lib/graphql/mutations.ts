import { graphqlClient } from './client';
import type { GeminiSketchResponse } from '../gemini/improveSketchPrompt';

const IMPROVE_SKETCH_MUTATION = `
  mutation ImproveSketch($input: ImproveSketchInput!) {
    improveSketch(input: $input) {
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
  // Validate svg is actually a string
  if (typeof svg !== 'string') {
    console.error('improveSketch called with non-string svg:', typeof svg, svg);
    throw new Error(`SVG must be a string, got ${typeof svg}`);
  }
  
  if (!svg || svg.trim().length === 0) {
    throw new Error('SVG string is empty');
  }
  
  try {
    const data = await graphqlClient.request<{
      improveSketch: {
        result: {
          cleanSvgPath: string;
          isClosed: boolean;
          suggestedDepth: number;
          suggestedBevel: number;
          notes: string;
        } | null;
        errors: string[];
      };
    }>(IMPROVE_SKETCH_MUTATION, { 
      input: {
        svg: String(svg), // Ensure it's a string
        hints: hints ? String(hints) : null
      }
    });
    return data.improveSketch;
  } catch (error) {
    console.error("GraphQL request error:", error);
    throw error;
  }
}

