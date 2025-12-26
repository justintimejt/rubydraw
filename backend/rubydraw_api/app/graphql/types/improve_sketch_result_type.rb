# frozen_string_literal: true

module Types
  class ImproveSketchResultType < Types::BaseObject
    description "Result of improving a sketch via Gemini"

    field :display_svg, String, null: false, description: "Complete styled SVG for 2D display in tldraw"
    field :extrusion_path, String, null: false, description: "Single closed silhouette outline as SVG path 'd' string for 3D extrusion"
    field :is_closed, Boolean, null: false, description: "Whether the extrusion path is closed"
    field :suggested_depth, Float, null: false, description: "Suggested extrusion depth"
    field :suggested_bevel, Float, null: false, description: "Suggested bevel size"
    field :palette, [String], null: false, description: "Hex colours used in displaySvg"
    field :notes, String, null: false, description: "Explanation of repairs made"
  end
end

