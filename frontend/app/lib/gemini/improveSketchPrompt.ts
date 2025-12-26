type ImproveSketchInputs = {
  svg: string;
  hints?: string;
};

export type GeminiSketchResponse = {
  displaySvg: string;
  extrusionPath: string;
  isClosed: boolean;
  suggestedDepth: number;
  suggestedBevel: number;
  palette: string[];
  notes: string;
};

export const improveSketchJsonSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    cleanSvgPath: {
      type: "string",
      description:
        "An SVG path 'd' string for ONE cleaned, CLOSED outline. No <svg> wrapper. No <path> tag. Just the d string.",
    },
    isClosed: {
      type: "boolean",
      description:
        "True if cleanSvgPath is a closed outline suitable for filling/extrusion.",
    },
    suggestedDepth: {
      type: "number",
      description:
        "Recommended extrusion depth in Three.js world units (e.g. 0.1–0.5).",
    },
    suggestedBevel: {
      type: "number",
      description: "Recommended bevel size in world units. Use 0 for no bevel.",
    },
    notes: {
      type: "string",
      description:
        "Short explanation of what was repaired (e.g. 'closed small gaps', 'smoothed jitter', 'snapped to symmetry').",
    },
  },
  required: [
    "cleanSvgPath",
    "isClosed",
    "suggestedDepth",
    "suggestedBevel",
    "notes",
  ],
} as const;

const systemMessage = `
You are a vector cleanup engine for 3D extrusion.
You receive a rough sketch as SVG (from a drawing app).
Your job is to output a single clean CLOSED outline as an SVG path 'd' string suitable for filling and extrusion.

Hard rules:
- Output MUST be valid JSON matching the provided JSON schema.
- Output MUST contain only JSON (no markdown, no extra text).
- cleanSvgPath MUST be a single closed outline (one silhouette).
- Prefer smooth, simple geometry with fewer points (remove jitter).
- Preserve the user's intent; do not invent unrelated details.
- If the drawing is ambiguous, choose the most likely intended silhouette and explain in notes.
`.trim();

function buildUserMessage({ svg, hints }: ImproveSketchInputs) {
  const hintText = hints && hints.trim().length > 0 ? hints.trim() : "None";
  return `
Task: Clean and repair this rough sketch so it can be extruded into a 3D model.

What “clean” means:
- Remove jitter and wobbly lines
- Simplify while preserving the intended shape
- Close small gaps; ensure the outline is closed
- Fix minor self-intersections if needed to produce a valid filled silhouette
- Keep the final outline as ONE silhouette (single loop)

Return format:
- Return ONLY JSON that matches the provided schema
- cleanSvgPath must be ONLY the SVG path 'd' string for the cleaned outline
- Do NOT include <svg> or <path> wrappers
- Do NOT return multiple paths

User hints (optional): ${hintText}

Input SVG (selection export):
${svg}
  `.trim();
}

/**
 * Shape a request payload for Gemini (or any LLM that supports system/user messages + JSON schema).
 * Caller is responsible for adding API keys and fetch logic.
 */
export function buildGeminiImproveSketchRequest(inputs: ImproveSketchInputs) {
  return {
    systemMessage,
    userMessage: buildUserMessage(inputs),
    responseMimeType: "application/json",
    responseJsonSchema: improveSketchJsonSchema,
  };
}
