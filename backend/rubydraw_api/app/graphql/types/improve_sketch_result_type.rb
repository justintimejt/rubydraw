# frozen_string_literal: true

module Types
  class ImproveSketchResultType < Types::BaseObject
    description "Result of improving a sketch via Gemini image generation"

    field :image_base64, String, null: false, description: "Improved image as base64-encoded PNG"
    field :title, String, null: false, description: "Short title describing the improved sketch"
    field :style, String, null: false, description: "Style description, e.g. 'clean flat vector', 'ink outline', 'sticker'"
    field :palette, [String], null: false, description: "Hex colors used in the image"
    field :background, String, null: false, description: "'transparent' or a hex color"
    field :notes, String, null: false, description: "What was improved (smooth lines, consistent stroke, etc.)"
  end
end

