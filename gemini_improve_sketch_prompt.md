# Gemini 2.5 Flash — “Improve Sketch” Prompt (tldraw → cleaned SVG → Three.js)

Use this prompt as the **LLM-in-between** step:
1) User draws a rough sketch in **tldraw**
2) Export the selection as **SVG** (vector)
3) Send SVG to Gemini to **clean / repair / normalize** into a **single closed outline**
4) Convert the returned path into a `THREE.Shape` and **extrude** in Three.js

This doc contains:
- the **contract** (JSON output)
- a **ready-to-send prompt template** (System + User)
- practical rules to keep output deterministic for 3D extrusion

---

## 1) Output contract (what the model MUST return)

Return **only** JSON that matches this schema:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "cleanSvgPath": {
      "type": "string",
      "description": "An SVG path 'd' string for ONE cleaned, CLOSED outline. No <svg> wrapper. No <path> tag. Just the d string."
    },
    "isClosed": {
      "type": "boolean",
      "description": "True if cleanSvgPath is a closed outline suitable for filling/extrusion."
    },
    "suggestedDepth": {
      "type": "number",
      "description": "Recommended extrusion depth in Three.js world units (e.g. 0.1–0.5)."
    },
    "suggestedBevel": {
      "type": "number",
      "description": "Recommended bevel size in world units. Use 0 for no bevel."
    },
    "notes": {
      "type": "string",
      "description": "Short explanation of what was repaired (e.g. 'closed small gaps', 'smoothed jitter', 'snapped to symmetry')."
    }
  },
  "required": ["cleanSvgPath", "isClosed", "suggestedDepth", "suggestedBevel", "notes"]
}
```

**Important:** `cleanSvgPath` must be a **single** outline (one closed loop). If the input implies multiple pieces, merge them into the most likely single silhouette.

---

## 2) Prompt template (send to Gemini)

### 2.1 System message (recommended)

> If your Gemini call supports a system instruction, use this as the system message.

```text
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
```

### 2.2 User message template (copy/paste)

Replace the placeholders.

```text
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

User hints (optional): {HINTS}

Input SVG (selection export):
{SVG_STRING}
```

---

## 3) Practical rules for good 3D results

### 3.1 Coordinate / scale expectations
- tldraw exports are in **2D**; your Three.js pipeline will scale it to world units.
- The model should keep output in the **same coordinate space** as the input (no arbitrary scaling).
- Keep `suggestedDepth` modest (start around `0.2`) unless hints say otherwise.

### 3.2 Closure requirement
- Extrusion requires a filled shape. The cleaned outline should end with `Z` / close-path behavior.
- Set `isClosed = true` only if the outline is actually closed.

### 3.3 Avoid extremely dense paths
- Prefer fewer points / smooth curves (cubic Béziers are fine).
- Avoid tiny zig-zag segments; they create bad normals and heavy geometry.

### 3.4 Holes (MVP recommendation)
For MVP: **do not create holes**. Return only one silhouette.
(You can extend the schema later to support multiple subpaths / even-odd fill.)

---

## 4) Backend call shape (Rails → Gemini)

When using Gemini structured outputs, enforce:
- `responseMimeType: "application/json"`
- `responseJsonSchema: <schema above>`

This guarantees parseable JSON.

**Suggestion:** Log the raw SVG input + model JSON output for debugging.

---

## 5) Frontend usage (what you do with cleanSvgPath)

### 5.1 Create a minimal SVG wrapper for parsing
You will wrap the `d` string into SVG for `SVGLoader`:

```js
const svg = `<svg xmlns="http://www.w3.org/2000/svg"><path d="${cleanSvgPath}" /></svg>`
```

### 5.2 Parse → shapes → extrude (Three.js)
Using `SVGLoader` (three-stdlib or Three examples):

```js
const loader = new SVGLoader()
const data = loader.parse(svg)
const shapes = []
for (const p of data.paths) {
  shapes.push(...SVGLoader.createShapes(p))
}
const geometry = new THREE.ExtrudeGeometry(shapes[0], {
  depth: suggestedDepth,
  bevelEnabled: suggestedBevel > 0,
  bevelSize: suggestedBevel,
  bevelThickness: suggestedBevel,
  bevelSegments: suggestedBevel > 0 ? 2 : 0,
})
geometry.center()
```

> MVP: use the first shape. Later you can union or handle multiple.

---

## 6) Quick test checklist

- Input: rough hand-drawn circle
  - Output: clean ellipse-like closed path
  - isClosed: true
- Input: almost-closed blob with a tiny gap
  - Output: closed silhouette (gap repaired)
  - notes mentions gap closure
- Input: scribble
  - Output: simplified silhouette, fewer points, no weird spikes

---

## 7) Suggested future schema upgrades (not MVP)

- `cleanSvgPaths: string[]` (multiple outlines)
- `holes: string[]` (subpaths)
- `symmetry: { axis: "x"|"y"|..., applied: boolean }`
- `thicknessProfile` / `latheProfile` for revolve models
