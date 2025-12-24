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
      result: {
        cleanSvgPath: string;
        isClosed: boolean;
        suggestedDepth: number;
        suggestedBevel: number;
        notes: string;
      } | null;
      errors: string[];
    };
  }>(IMPROVE_SKETCH_MUTATION, { svg, hints });
  return data.improveSketch;
}

