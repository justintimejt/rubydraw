# Gemini 2.0 Flash (Preview) Image Generation — Improve Sketch 2D Render Prompt

Use this prompt with **`gemini-2.0-flash-preview-image-generation`** to generate a **clean 2D image** from a rough sketch, then display it on the tldraw canvas as part of your **Improve Sketch** feature.

This doc includes:
- Recommended **input format** (send a PNG of the selection)
- A **prompt template** (System + User)
- A **metadata JSON contract** (returned as text alongside the image)
- Notes for **placing the image on tldraw** as an asset

---

## 1) Recommended input to the model

### Send the sketch as an image (preferred)
Gemini image generation works best when it can see pixels. Export the tldraw selection to a **PNG** (transparent background if possible), then send it as an image part.

Optional but helpful:
- Also include the **SVG string** as text (for extra structural hints).
- Include user hints like: “make it icon style”, “use 3 colours”, “outline only”.

---

## 2) Output expectations

Gemini may return:
- **Image** (binary / base64, depending on your SDK)
- **Text** parts

For reliability, ask for:
1) **One image** (clean 2D result)
2) **One short JSON metadata block** in the text output

### Metadata JSON schema (text part)
Your backend should parse the first text part that contains JSON matching:

```json
{
  "type": "object",
  "additionalProperties": false,
  "properties": {
    "title": { "type": "string" },
    "style": { "type": "string", "description": "e.g. 'clean flat vector', 'ink outline', 'sticker'" },
    "palette": { "type": "array", "items": { "type": "string" }, "description": "hex colors" },
    "background": { "type": "string", "description": "'transparent' or a hex color" },
    "notes": { "type": "string", "description": "What was improved (smooth lines, consistent stroke, etc.)" }
  },
  "required": ["title", "style", "palette", "background", "notes"]
}
```

> If your integration supports structured output for the **text** part, enforce it. Otherwise, do a best-effort JSON parse.

---

## 3) Prompt template (copy/paste)

### 3.1 System message (recommended)

```text
You are a sketch cleanup and illustration engine for a drawing app.

You will receive a rough sketch image (and optionally its SVG).
Your job is to generate ONE cleaned 2D illustration that preserves the user's intent.

Hard rules:
- Produce exactly ONE image.
- Use clean, confident lines: consistent stroke width, smooth curves, tidy edges.
- Use a limited palette (3–5 colors max) and flat fills. No gradients.
- Prefer transparent background unless the user asks otherwise.
- Avoid tiny details and noise; simplify while keeping recognizability.
- Also output ONE JSON metadata object as plain text (and nothing else in text).
```

### 3.2 User message template

Replace placeholders.

```text
Task: Improve this rough sketch into a clean 2D illustration for display on a canvas.

Style requirements:
- Clean flat vector / sticker-like look
- Consistent outline stroke width
- Round caps and joins
- Flat fills (no gradients)
- Palette limited to 3–5 colors
- Transparent background (unless user asked otherwise)

What to improve:
- Remove jitter and wobbly lines
- Fix small gaps
- Make shapes symmetric where appropriate
- Simplify messy areas while preserving intent

Return:
- One image
- One JSON metadata object (plain text only) matching the schema:
  {title, style, palette, background, notes}

User hints (optional): {HINTS}

Optional SVG (if available):
{SVG_STRING}
```

---

## 4) Displaying the result in tldraw (recommended approach)

Do **not** convert this image back into a `draw` shape.

Instead:
1) Save the returned image bytes/base64 as an **asset** (image/png or image/webp).
2) Insert an **image shape** that references the asset.
3) Place it near/over the original selection bounding box.

This preserves:
- crisp lines
- fills and colors
- visual quality

---

## 5) Implementation notes (backend)

When calling the model:
- Include the PNG as an **image part**
- Include the text prompt as a **text part**
- Keep temperature low (0–0.3) if supported for steadier results

On response:
- Extract the **image** (for display)
- Extract the **metadata JSON** from the first text part that parses as JSON

---

## 6) Quick QA checklist

- Rough circle sketch → clean circle/ellipse with consistent line
- Messy rectangle → straightened edges, clean corners
- Scribbly icon → simplified but recognizable symbol
- Background is transparent (unless requested otherwise)
- Metadata JSON parses and includes palette + notes
