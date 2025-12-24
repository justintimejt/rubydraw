# frozen_string_literal: true

# Service class for interacting with Google Gemini API
# Handles sketch improvement requests with structured JSON output
class GeminiService
  API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
  JSON_SCHEMA = {
    type: "object",
    additionalProperties: false,
    properties: {
      cleanSvgPath: {
        type: "string",
        description: "An SVG path 'd' string for ONE cleaned, CLOSED outline. No <svg> wrapper. No <path> tag. Just the d string."
      },
      isClosed: {
        type: "boolean",
        description: "True if cleanSvgPath is a closed outline suitable for filling/extrusion."
      },
      suggestedDepth: {
        type: "number",
        description: "Recommended extrusion depth in Three.js world units (e.g. 0.1–0.5)."
      },
      suggestedBevel: {
        type: "number",
        description: "Recommended bevel size in world units. Use 0 for no bevel."
      },
      notes: {
        type: "string",
        description: "Short explanation of what was repaired (e.g. 'closed small gaps', 'smoothed jitter', 'snapped to symmetry')."
      }
    },
    required: %w[cleanSvgPath isClosed suggestedDepth suggestedBevel notes]
  }.freeze

  SYSTEM_MESSAGE = <<~TEXT.strip
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
  TEXT

  class Error < StandardError; end
  class APIError < Error; end
  class InvalidResponseError < Error; end

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("GEMINI_API_KEY") { raise Error, "GEMINI_API_KEY environment variable is required" }
  end

  # Improves a sketch SVG by sending it to Gemini for cleaning/repair
  #
  # @param svg [String] The input SVG string
  # @param hints [String, nil] Optional user hints for the improvement
  # @return [Hash] Response with keys: cleanSvgPath, isClosed, suggestedDepth, suggestedBevel, notes
  # @raise [APIError] If the API call fails
  # @raise [InvalidResponseError] If the response cannot be parsed
  def improve_sketch(svg:, hints: nil)
    user_message = build_user_message(svg, hints)
    response = call_api(user_message)

    parse_response(response)
  rescue Faraday::Error => e
    Rails.logger.error("Gemini API error: #{e.message}")
    raise APIError, "Failed to call Gemini API: #{e.message}"
  rescue JSON::ParserError => e
    Rails.logger.error("Failed to parse Gemini response: #{e.message}")
    raise InvalidResponseError, "Invalid JSON response from Gemini: #{e.message}"
  end

  private

  def build_user_message(svg, hints)
    hint_text = hints&.strip&.present? ? hints.strip : "None"
    <<~TEXT.strip
      Task: Clean and repair this rough sketch so it can be extruded into a 3D model.

      What "clean" means:
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

      User hints (optional): #{hint_text}

      Input SVG (selection export):
      #{svg}
    TEXT
  end

  def call_api(user_message)
    url = "#{API_BASE_URL}?key=#{@api_key}"
    conn = Faraday.new do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
    end

    payload = {
      systemInstruction: {
        parts: [
          { text: SYSTEM_MESSAGE }
        ]
      },
      contents: [
        {
          parts: [
            { text: user_message }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA
      }
    }

    Rails.logger.info("Calling Gemini API with SVG length: #{user_message.length}")

    response = conn.post(url, payload)

    unless response.success?
      error_body = response.body.is_a?(Hash) ? response.body : { error: response.body.to_s }
      Rails.logger.error("Gemini API error response: #{error_body}")
      raise APIError, "Gemini API returned error: #{error_body}"
    end

    response.body
  end

  def parse_response(response_body)
    # Extract the text content from Gemini's response structure
    candidates = response_body.dig("candidates") || []
    raise InvalidResponseError, "No candidates in response" if candidates.empty?

    content = candidates.first.dig("content", "parts")&.first&.dig("text")
    raise InvalidResponseError, "No text content in response" if content.blank?

    # Parse the JSON string
    parsed = JSON.parse(content)
    
    # Validate required fields
    required_fields = %w[cleanSvgPath isClosed suggestedDepth suggestedBevel notes]
    missing = required_fields - parsed.keys
    raise InvalidResponseError, "Missing required fields: #{missing.join(', ')}" unless missing.empty?

    # Convert to symbol keys for consistency
    {
      cleanSvgPath: parsed["cleanSvgPath"],
      isClosed: parsed["isClosed"],
      suggestedDepth: parsed["suggestedDepth"].to_f,
      suggestedBevel: parsed["suggestedBevel"].to_f,
      notes: parsed["notes"]
    }
  end
end

