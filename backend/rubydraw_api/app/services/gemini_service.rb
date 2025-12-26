# frozen_string_literal: true

# Service class for interacting with Google Gemini API
# Handles sketch improvement requests with structured JSON output
class GeminiService
  # Using Gemini 2.5 Flash for structured outputs
  API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent"
  # JSON Schema for structured output - must match Gemini API format
  JSON_SCHEMA = {
    type: "object",
    properties: {
      displaySvg: {
        type: "string",
        description: "A complete styled SVG string (<svg ...>...</svg>) for 2D display in tldraw. May include multiple paths/groups. Must include viewBox."
      },
      extrusionPath: {
        type: "string",
        description: "A single closed silhouette outline as an SVG path 'd' string. No wrapper tags. Must represent ONE closed loop for extrusion."
      },
      isClosed: {
        type: "boolean",
        description: "True if extrusionPath is a closed outline suitable for filling/extrusion."
      },
      suggestedDepth: {
        type: "number",
        description: "Extrusion depth in Three.js world units (e.g. 0.1–0.5)."
      },
      suggestedBevel: {
        type: "number",
        description: "Bevel size in world units (0 for none)."
      },
      palette: {
        type: "array",
        items: { type: "string" },
        description: "Hex colours used in displaySvg, e.g. [\"#111111\", \"#F97316\"]."
      },
      notes: {
        type: "string",
        description: "Short explanation of what was repaired (e.g. 'closed small gaps', 'smoothed jitter', 'snapped to symmetry')."
      }
    },
    required: ["displaySvg", "extrusionPath", "isClosed", "suggestedDepth", "suggestedBevel", "palette", "notes"]
  }.freeze

  SYSTEM_MESSAGE = <<~TEXT.strip
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
    - Preserve the user's intent; do not invent unrelated details.
    - If ambiguous, choose the most likely silhouette and explain in notes.
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
  # @return [Hash] Response with keys: displaySvg, extrusionPath, isClosed, suggestedDepth, suggestedBevel, palette, notes
  # @raise [APIError] If the API call fails
  # @raise [InvalidResponseError] If the response cannot be parsed
  def improve_sketch(svg:, hints: nil)
    puts "[GeminiService] Starting improve_sketch"
    puts "[GeminiService] SVG length: #{svg.length}"
    puts "[GeminiService] Hints: #{hints || 'none'}"
    
    user_message = build_user_message(svg, hints)
    response = call_api(user_message)

    parse_response(response)
  rescue Faraday::TimeoutError => e
    error_message = "Gemini API request timed out: #{e.message}"
    Rails.logger.error("Gemini API timeout: #{e.message}")
    puts "[GeminiService] TIMEOUT ERROR: #{e.class.name} - #{e.message}"
    puts "[GeminiService] This usually means the API is taking too long to respond."
    puts "[GeminiService] Try reducing the SVG complexity or check your network connection."
    puts "[GeminiService] Backtrace: #{e.backtrace.first(5).join("\n")}"
    raise APIError, error_message
  rescue Faraday::Error => e
    error_message = "Failed to call Gemini API: #{e.message}"
    Rails.logger.error("Gemini API error: #{e.message}")
    puts "[GeminiService] Faraday error: #{e.class.name} - #{e.message}"
    puts "[GeminiService] Backtrace: #{e.backtrace.first(5).join("\n")}"
    raise APIError, error_message
  rescue JSON::ParserError => e
    error_message = "Invalid JSON response from Gemini: #{e.message}"
    Rails.logger.error("Failed to parse Gemini response: #{e.message}")
    puts "[GeminiService] JSON parse error: #{e.message}"
    raise InvalidResponseError, error_message
  rescue StandardError => e
    error_message = "Unexpected error in GeminiService: #{e.class.name} - #{e.message}"
    Rails.logger.error(error_message)
    Rails.logger.error(e.backtrace.join("\n"))
    puts "[GeminiService] Unexpected error: #{e.class.name} - #{e.message}"
    puts "[GeminiService] Backtrace: #{e.backtrace.first(10).join("\n")}"
    raise
  end

  private

  def build_user_message(svg, hints)
    hint_text = hints&.strip&.present? ? hints.strip : "None"
    <<~TEXT.strip
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

      User hints (optional): #{hint_text}

      Input SVG:
      #{svg}

      Optional PNG preview (base64, if provided):
      #{""}
    TEXT
  end

  def call_api(user_message)
    url = "#{API_BASE_URL}?key=#{@api_key}"
    conn = Faraday.new do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
      # Set longer timeouts for Gemini API (it can take a while to process complex SVGs)
      f.options.timeout = 300 # 5 minutes for the request
      f.options.open_timeout = 30 # 30 seconds to establish connection
      f.options.read_timeout = 300 # 5 minutes to read response
    end

    # Build payload according to Gemini API v1beta format
    payload = {
      contents: [
        {
          parts: [
            { text: "#{SYSTEM_MESSAGE}\n\n#{user_message}" }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: JSON_SCHEMA
      }
    }
    
    # Add systemInstruction if supported (some models support it, others don't)
    # For now, we'll include it in the user message to ensure compatibility
    # Uncomment below if your model supports systemInstruction:
    # payload[:systemInstruction] = {
    #   parts: [
    #     { text: SYSTEM_MESSAGE }
    #   ]
    # }

    Rails.logger.info("Calling Gemini API with SVG length: #{user_message.length}")
    puts "[GeminiService] Calling Gemini API with SVG length: #{user_message.length}"
    puts "[GeminiService] Request URL: #{url.gsub(/key=[^&]+/, 'key=***')}"
    puts "[GeminiService] Payload size: #{payload.to_json.length} bytes"
    puts "[GeminiService] Timeout settings: open=30s, read=300s, total=300s"
    
    start_time = Time.now
    response = conn.post(url, payload)
    elapsed = Time.now - start_time
    puts "[GeminiService] API call completed in #{elapsed.round(2)} seconds"

    unless response.success?
      error_body = response.body.is_a?(Hash) ? response.body : { error: response.body.to_s }
      error_message = "Gemini API returned error: #{error_body}"
      Rails.logger.error("Gemini API error response: #{error_body}")
      puts "[GeminiService] ERROR: #{error_message}"
      puts "[GeminiService] Response status: #{response.status}"
      puts "[GeminiService] Response headers: #{response.headers.inspect}"
      puts "[GeminiService] Response body: #{error_body.inspect}"
      puts "[GeminiService] Request URL: #{url.gsub(/key=[^&]+/, 'key=***')}"
      puts "[GeminiService] Payload keys: #{payload.keys.inspect}"
      raise APIError, error_message
    end

    puts "[GeminiService] API call successful"
    puts "[GeminiService] Full response body:"
    puts JSON.pretty_generate(response.body)
    response.body
  end

  def parse_response(response_body)
    puts "[GeminiService] Parsing response..."
    puts "[GeminiService] Full response body for parsing:"
    puts JSON.pretty_generate(response_body)
    puts "[GeminiService] Response keys: #{response_body.keys.inspect}"
    
    # Extract the text content from Gemini's response structure
    candidates = response_body.dig("candidates") || []
    puts "[GeminiService] Found #{candidates.length} candidate(s)"
    
    raise InvalidResponseError, "No candidates in response" if candidates.empty?

    content = candidates.first.dig("content", "parts")&.first&.dig("text")
    puts "[GeminiService] Content present: #{content.present?}, length: #{content&.length}"
    
    raise InvalidResponseError, "No text content in response" if content.blank?

    # Parse the JSON string
    begin
      parsed = JSON.parse(content)
      puts "[GeminiService] Parsed JSON successfully:"
      puts JSON.pretty_generate(parsed)
      puts "[GeminiService] Parsed keys: #{parsed.keys.inspect}"
    rescue JSON::ParserError => e
      puts "[GeminiService] JSON parse error: #{e.message}"
      puts "[GeminiService] Content preview: #{content[0..500]}"
      raise InvalidResponseError, "Failed to parse JSON response: #{e.message}"
    end
    
    # Validate required fields
    required_fields = %w[displaySvg extrusionPath isClosed suggestedDepth suggestedBevel palette notes]
    missing = required_fields - parsed.keys
    if missing.any?
      puts "[GeminiService] Missing required fields: #{missing.join(', ')}"
      puts "[GeminiService] Available fields: #{parsed.keys.join(', ')}"
      raise InvalidResponseError, "Missing required fields: #{missing.join(', ')}"
    end

    # Convert to symbol keys for consistency
    result = {
      displaySvg: parsed["displaySvg"],
      extrusionPath: parsed["extrusionPath"],
      isClosed: parsed["isClosed"],
      suggestedDepth: parsed["suggestedDepth"].to_f,
      suggestedBevel: parsed["suggestedBevel"].to_f,
      palette: parsed["palette"] || [],
      notes: parsed["notes"]
    }
    
    puts "[GeminiService] Successfully parsed response"
    puts "[GeminiService] displaySvg length: #{result[:displaySvg].length}"
    puts "[GeminiService] extrusionPath length: #{result[:extrusionPath].length}"
    puts "[GeminiService] isClosed: #{result[:isClosed]}"
    puts "[GeminiService] suggestedDepth: #{result[:suggestedDepth]}"
    puts "[GeminiService] suggestedBevel: #{result[:suggestedBevel]}"
    puts "[GeminiService] palette: #{result[:palette].inspect}"
    
    result
  end
end

