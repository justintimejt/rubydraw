# frozen_string_literal: true

module Types
  class ImproveSketchResultType < Types::BaseObject
    description "Result of improving a sketch via Gemini"

    field :clean_svg_path, String, null: false, description: "Cleaned SVG path 'd' string"
    field :is_closed, Boolean, null: false, description: "Whether the path is closed"
    field :suggested_depth, Float, null: false, description: "Suggested extrusion depth"
    field :suggested_bevel, Float, null: false, description: "Suggested bevel size"
    field :notes, String, null: false, description: "Explanation of repairs made"
  end
end

