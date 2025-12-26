# Improve Sketch — Make it Look Good in tldraw (Lines, Colours) + Still Work for Three.js

This doc explains **why your Improve Sketch feature looks bad on the tldraw canvas** and how to fix it by separating:
- **2D display output** (pretty SVG with strokes/fills/colour)
- **3D modeling output** (single closed silhouette path for extrusion)

It also provides a **ready-to-send prompt** for Gemini and a **JSON contract** for structured output.

---

## 1) Why the “improved drawing” looks bad right now

### Root cause: converting SVG → tldraw `draw` shape loses quality
Even if Gemini returns a nice SVG path, your `addImprovedShapeToCanvas` currently:
- parses the SVG `d` string into points
- creates a `draw` shape (freehand polyline)

This usually looks bad because:
- `draw` shapes approximate curves with lots of points → jaggy/uneven
- stroke joins/caps, fills, layering, and precise Béziers are lost
- colour + multiple layers are hard to represent as a single `draw` record

**Result:** The “improved” drawing is worse than the SVG you got back.

---

## 2) Fix: return TWO outputs from Gemini

### A) `displaySvg` (for tldraw canvas)
A complete SVG string with:
- consistent stroke width
- round joins/caps
- optional flat fills
- limited palette (3–5 colours)
- simple, clean shapes

You should put this back onto the canvas as:
- an **SVG asset/image** (MVP best)
- or a **custom tldraw shape** that renders SVG (best long-term)

### B) `extrusionPath` (for Three.js)
A single closed silhouette outline as an SVG path `d` string:
- one loop (closed, filled)
- simplified + repaired
- suitable for `SVGLoader` → `Shape` → `ExtrudeGeometry`

**Key principle:** 2D prettiness ≠ 3D silhouette needs. Keep them separate.

---

## 3) Recommended render strategy (important)

### Do NOT add the improved drawing as a `draw` shape
Instead:

**MVP recommendation**
- Create a tldraw **asset** containing the returned `displaySvg` (data URL is OK)
- Add an **image/svg shape** that references the asset

This preserves:
- curves (true Béziers)
- crisp lines
- fills and colours
- layering

### Why this improves “lines, colours, etc”
SVG naturally supports:
- `stroke`, `stroke-width`, `stroke-linecap`, `stroke-linejoin`
- multiple paths/groups (line layer vs fill layer)
- consistent styling rules

tldraw `draw` shapes do not.

---

## 4) Improve input to Gemini: send SVG + PNG (multimodal)

SVG is good, but rough sketches are often ambiguous.

Upgrade input:
- **SVG** (vector geometry)
- **PNG** preview (raster) of the selection (even a simple render/screenshot)

Gemini is much better at “intent cleanup” when it can see the sketch, not just parse SVG geometry.

---

## 5) Upgrade the contract (JSON schema)

Return only JSON matching:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "displaySvg": {
      "type": "string",
      "description": "A complete styled SVG string (<svg ...>...</svg>) for 2D display in tldraw. May include multiple paths/groups. Must include viewBox."
    },
    "extrusionPath": {
      "type": "string",
      "description": "A single closed silhouette outline as an SVG path 'd' string. No wrapper tags. Must represent ONE closed loop for extrusion."
    },
    "isClosed": { "type": "boolean" },
    "suggestedDepth": {
      "type": "number",
      "description": "Extrusion depth in Three.js world units (e.g. 0.1–0.5)."
    },
    "suggestedBevel": {
      "type": "number",
      "description": "Bevel size in world units (0 for none)."
    },
    "palette": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Hex colours used in displaySvg, e.g. ["#111111", "#F97316"]."
    },
    "notes": { "type": "string" }
  },
  "required": [
    "displaySvg",
    "extrusionPath",
    "isClosed",
    "suggestedDepth",
    "suggestedBevel",
    "palette",
    "notes"
  ]
}
```

---

## 6) Prompt: Gemini “Improve Sketch” (2D + 3D outputs)

### 6.1 System message (recommended)

```text
You are a vector cleanup and stylization engine for a sketch-to-3D app.

You will receive a rough sketch exported as SVG (and optionally a PNG preview).
Your job is to produce TWO outputs:
1) displaySvg: a complete, styled SVG suitable for clean 2D display (nice lines, colours, optional fills).
2) extrusionPath: a single, cleaned, CLOSED silhouette outline (SVG path d string) suitable for 3D extrusion.

Hard rules:
- Output MUST be valid JSON matching the provided schema. Output ONLY JSON.
- displaySvg MUST include a viewBox and must not rely on external resources.
- displaySvg should use consistent stroke width and round joins/caps.
- Use a limited flat palette (3–5 colours max) and avoid gradients.
- extrusionPath MUST be ONE closed loop (single silhouette). Avoid holes for MVP.
- Preserve the user’s intent; do not invent unrelated details.
- If ambiguous, choose the most likely silhouette and explain in notes.
```

### 6.2 User message template

```text
Task: Improve this rough sketch so it looks clean in 2D and can be extruded in 3D.

2D display goals (displaySvg):
- Crisp, clean strokes
- Consistent stroke width
- Round linecaps and round joins
- Optional flat fills (no gradients)
- Palette limited to 3–5 colours
- Simplify messy details; preserve intent
- Output a complete SVG string with <svg ... viewBox="..."> ... </svg>

3D modeling goals (extrusionPath):
- Return ONE closed silhouette outline as an SVG path 'd' string
- Remove jitter, repair tiny gaps, remove self-intersections where possible
- Keep it simple and extrudable (no holes for MVP)
- Ensure it is closed (ends with Z / closepath)

Return format:
- Return ONLY JSON that matches the schema (no markdown)

User hints (optional): {HINTS}

Input SVG:
{SVG_STRING}

Optional PNG preview (base64, if provided):
{PNG_BASE64_OR_EMPTY}
```

---

## 7) Deterministic generation settings (recommended)

For consistency:
- Temperature: 0–0.3
- Ask for fewer points / smoother curves
- Prefer “clean icon-like style” unless user asks for detail

---

## 8) Frontend usage notes

### 8.1 Use `displaySvg` for the tldraw canvas
- Add `displaySvg` as an **SVG asset** (image) to preserve quality
- Place it near the original selection (or overlay on top)
- Optionally dim/hide the original rough shapes

### 8.2 Use `extrusionPath` for Three.js
- Wrap into a minimal SVG for parsing:
  - `<svg><path d="..."/></svg>`
- Use `SVGLoader` → `createShapes` → `ExtrudeGeometry`

This keeps 3D stable even if the 2D SVG has multiple paths.

---

## 9) Backend call reminders

- Prefer Gemini 2.5 Flash for this use-case (better cleanup/stylization).
- Use structured output:
  - `responseMimeType: "application/json"`
  - `responseJsonSchema: <schema above>`
- Validate server-side:
  - parse JSON
  - ensure required fields exist
  - ensure `extrusionPath` appears closed (basic check: contains `Z`/`z`)

---

## 10) Minimal acceptance tests

1) Rough circle sketch
- displaySvg: clean circle/ellipse with crisp stroke and maybe fill
- extrusionPath: closed loop

2) Almost-closed blob with a small gap
- notes mentions “closed gap”
- extrusionPath closed and simplified

3) Simple icon-like drawing
- palette limited
- strokes consistent
- extrusionPath is a reasonable silhouette

---

## 11) Summary (what to change first)

**Do these first:**
1) Change schema to return **displaySvg + extrusionPath**
2) Render `displaySvg` on canvas as **SVG asset/image**, not a `draw` shape

This is the fastest path to “improved sketch looks good with lines + colours” while still driving Three.js extrusion.
