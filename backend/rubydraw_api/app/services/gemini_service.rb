# frozen_string_literal: true

require "digest"

# Service class for interacting with Google Gemini API
# Handles sketch improvement requests with image generation
class GeminiService
  # Using Gemini 2.5 Flash Image via AI Platform API
  API_BASE_URL = "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-image:generateContent"
  # Default non-image model for text generation tasks
  DEFAULT_NON_IMAGE_MODEL_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent"
  # JSON Schema for metadata output - must match Gemini API format
  JSON_SCHEMA = {
    type: "object",
    properties: {
      title: {
        type: "string",
        description: "Short title describing the improved sketch"
      },
      style: {
        type: "string",
        description: "Style description, e.g. 'clean flat vector', 'ink outline', 'sticker'"
      },
      palette: {
        type: "array",
        items: { type: "string" },
        description: "Hex colors used in the image, e.g. [\"#111111\", \"#F97316\"]"
      },
      background: {
        type: "string",
        description: "'transparent' or a hex color"
      },
      notes: {
        type: "string",
        description: "What was improved (smooth lines, consistent stroke, etc.)"
      }
    },
    required: ["title", "style", "palette", "background", "notes"]
  }.freeze

  SYSTEM_MESSAGE = <<~TEXT.strip
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
  TEXT

  class Error < StandardError; end
  class APIError < Error; end
  class InvalidResponseError < Error; end

  def initialize(api_key: nil)
    @api_key = api_key || ENV.fetch("GEMINI_API_KEY") { raise Error, "GEMINI_API_KEY environment variable is required" }
  end

  # Improves a sketch by sending PNG image to Gemini for cleaning/repair
  #
  # @param png_base64 [String] The input PNG image as base64 string
  # @param svg [String, nil] Optional SVG string for structural hints
  # @param hints [String, nil] Optional user hints for the improvement
  # @return [Hash] Response with keys: image_base64, title, style, palette, background, notes
  # @raise [APIError] If the API call fails
  # @raise [InvalidResponseError] If the response cannot be parsed
  def improve_sketch(png_base64:, svg: nil, hints: nil)
    puts "[GeminiService] Starting improve_sketch"
    puts "[GeminiService] PNG base64 length: #{png_base64.length}"
    puts "[GeminiService] SVG provided: #{svg.present?}"
    puts "[GeminiService] Hints: #{hints || 'none'}"

    cache_key = cache_key(png_base64: png_base64, svg: svg, hints: hints)
    
    # Try cache first
    cached_result = Rails.cache.read(cache_key)
    if cached_result
      puts "[GeminiService] Cache HIT for key: #{cache_key[0..50]}..."
      return cached_result
    end

    puts "[GeminiService] Cache MISS, calling API..."
    
    user_message = build_user_message(svg, hints)
    response = call_api(user_message, png_base64)
    result = parse_response(response)

    # Cache the result (7 days TTL)
    Rails.cache.write(cache_key, result, expires_in: 7.days)
    puts "[GeminiService] Result cached with key: #{cache_key[0..50]}..."

    result
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

  def cache_key(png_base64:, svg: nil, hints: nil)
    # Create a digest of inputs for cache key
    # Use full PNG base64 for accurate cache hits
    input_string = "#{png_base64}:#{svg || ''}:#{hints || ''}"
    digest = Digest::SHA256.hexdigest(input_string)
    "improve_sketch:v1:#{digest}"
  end

  def build_user_message(svg, hints)
    hint_text = hints&.strip&.present? ? hints.strip : "None"
    hint_placeholder = hint_text != "None" ? hint_text : ""
    
    message = <<~TEXT.strip
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
    TEXT
    
    if hint_placeholder.present?
      message += "\n\nUser hints (optional): #{hint_placeholder}"
    end
    
    if svg.present?
      message += "\n\nOptional SVG (if available):\n#{svg}"
    end
    
    message
  end

  def call_api(user_message, png_base64)
    url = "#{API_BASE_URL}?key=#{@api_key}"
    conn = Faraday.new do |f|
      f.request :json
      f.response :json
      f.adapter Faraday.default_adapter
      # Set longer timeouts for Gemini API (it can take a while to process images)
      f.options.timeout = 300 # 5 minutes for the request
      f.options.open_timeout = 30 # 30 seconds to establish connection
      f.options.read_timeout = 300 # 5 minutes to read response
    end

    # Build payload with image part and text part
    parts = []
    
    # Add image part (PNG as base64)
    parts << {
      inline_data: {
        mime_type: "image/png",
        data: png_base64
      }
    }
    
    # Add text part
    parts << { text: "#{SYSTEM_MESSAGE}\n\n#{user_message}" }
    
    payload = {
      contents: [
        {
          role: "user",
          parts: parts
        }
      ],
      generationConfig: {
        # Don't force JSON-only response - we need both image and text parts
        # The text part should contain JSON metadata, but we'll parse it manually
        temperature: 0.2 # Low temperature for steadier results
      }
    }

    Rails.logger.info("Calling Gemini API with PNG image (base64 length: #{png_base64.length})")
    puts "[GeminiService] Calling Gemini API with PNG image (base64 length: #{png_base64.length})"
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
    puts "[GeminiService] Response status: #{response.status}"
    puts "[GeminiService] Response headers:"
    response.headers.each do |key, value|
      if key.downcase.include?('rate') || key.downcase.include?('limit') || key.downcase.include?('quota')
        puts "  #{key}: #{value}"
      end
    end
    puts "[GeminiService] Full response body:"
    puts JSON.pretty_generate(response.body)
    response.body
  end

  def parse_response(response_body)
    puts "[GeminiService] Parsing response..."
    puts "[GeminiService] Full response body for parsing:"
    puts JSON.pretty_generate(response_body)
    puts "[GeminiService] Response keys: #{response_body.keys.inspect}"
    
    # Extract candidates from Gemini's response structure
    candidates = response_body.dig("candidates") || []
    puts "[GeminiService] Found #{candidates.length} candidate(s)"
    
    raise InvalidResponseError, "No candidates in response" if candidates.empty?

    candidate = candidates.first
    parts = candidate.dig("content", "parts") || []
    puts "[GeminiService] Found #{parts.length} part(s) in response"
    puts "[GeminiService] Parts structure: #{parts.map { |p| p.keys }.inspect}"
    
    # Extract image (base64) from parts
    # Try different possible formats for image data
    image_part = parts.find { |p| p["inline_data"] || p["inlineData"] }
    image_base64 = nil
    
    if image_part
      # Handle both snake_case and camelCase
      inline_data = image_part["inline_data"] || image_part["inlineData"]
      if inline_data
        image_base64 = inline_data["data"] || inline_data["data"]
        puts "[GeminiService] Found image part, base64 length: #{image_base64&.length}"
      end
    end
    
    # If still no image, check all parts for any data field
    if image_base64.nil?
      parts.each_with_index do |part, idx|
        puts "[GeminiService] Part #{idx}: #{part.keys.inspect}"
        if part["inline_data"] || part["inlineData"]
          inline_data = part["inline_data"] || part["inlineData"]
          image_base64 = inline_data["data"] if inline_data
          puts "[GeminiService] Found image in part #{idx}, base64 length: #{image_base64&.length}"
          break
        end
      end
    end
    
    if image_base64.nil?
      puts "[GeminiService] No image part found in response"
      puts "[GeminiService] Available parts: #{parts.inspect}"
      raise InvalidResponseError, "No image in response"
    end
    
    # Extract JSON metadata from text parts
    text_part = parts.find { |p| p["text"].present? }
    metadata_json = nil
    
    if text_part && text_part["text"].present?
      text_content = text_part["text"]
      puts "[GeminiService] Found text part, length: #{text_content.length}"
      
      # Try to parse JSON from text content
      begin
        # Remove markdown code blocks if present
        cleaned_text = text_content.gsub(/```json\s*/, "").gsub(/```\s*/, "").strip
        metadata_json = JSON.parse(cleaned_text)
        puts "[GeminiService] Parsed JSON metadata successfully:"
        puts JSON.pretty_generate(metadata_json)
      rescue JSON::ParserError => e
        puts "[GeminiService] JSON parse error: #{e.message}"
        puts "[GeminiService] Text content preview: #{text_content[0..500]}"
        # Create default metadata if parsing fails
        metadata_json = {
          "title" => "Improved Sketch",
          "style" => "clean flat vector",
          "palette" => [],
          "background" => "transparent",
          "notes" => "Sketch improved"
        }
        puts "[GeminiService] Using default metadata"
      end
    else
      puts "[GeminiService] No text part found, using default metadata"
      metadata_json = {
        "title" => "Improved Sketch",
        "style" => "clean flat vector",
        "palette" => [],
        "background" => "transparent",
        "notes" => "Sketch improved"
      }
    end
    
    # Validate required fields
    required_fields = %w[title style palette background notes]
    missing = required_fields - metadata_json.keys
    if missing.any?
      puts "[GeminiService] Missing required metadata fields: #{missing.join(', ')}"
      puts "[GeminiService] Available fields: #{metadata_json.keys.join(', ')}"
      # Fill in missing fields with defaults
      missing.each do |field|
        case field
        when "title"
          metadata_json["title"] = "Improved Sketch"
        when "style"
          metadata_json["style"] = "clean flat vector"
        when "palette"
          metadata_json["palette"] = []
        when "background"
          metadata_json["background"] = "transparent"
        when "notes"
          metadata_json["notes"] = "Sketch improved"
        end
      end
    end

    # Convert to symbol keys for consistency
    result = {
      image_base64: image_base64,
      title: metadata_json["title"],
      style: metadata_json["style"],
      palette: metadata_json["palette"] || [],
      background: metadata_json["background"],
      notes: metadata_json["notes"]
    }
    
    puts "[GeminiService] Successfully parsed response"
    puts "[GeminiService] Image base64 length: #{result[:image_base64].length}"
    puts "[GeminiService] Title: #{result[:title]}"
    puts "[GeminiService] Style: #{result[:style]}"
    puts "[GeminiService] Palette: #{result[:palette].inspect}"
    puts "[GeminiService] Background: #{result[:background]}"
    puts "[GeminiService] Notes: #{result[:notes]}"
    
    result
  end
end

