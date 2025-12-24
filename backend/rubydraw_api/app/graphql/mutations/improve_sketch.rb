# frozen_string_literal: true

module Mutations
  class ImproveSketch < Mutations::BaseMutation
    description "Improve a rough sketch SVG by cleaning and repairing it via Gemini API"

    argument :svg, String, required: true, description: "The input SVG string to improve"
    argument :hints, String, required: false, description: "Optional hints for the improvement process"

    field :result, Types::ImproveSketchResultType, null: true, description: "The improved sketch result"
    field :errors, [String], null: false, description: "List of errors if the operation failed"

    def resolve(svg:, hints: nil)
      # No authentication required for MVP, but can add later
      # user = context[:current_user] or raise GraphQL::ExecutionError, "Unauthorized"

      service = GeminiService.new
      result = service.improve_sketch(svg: svg, hints: hints)

      {
        result: {
          clean_svg_path: result[:cleanSvgPath],
          is_closed: result[:isClosed],
          suggested_depth: result[:suggestedDepth],
          suggested_bevel: result[:suggestedBevel],
          notes: result[:notes]
        },
        errors: []
      }
    rescue GeminiService::Error => e
      Rails.logger.error("Gemini service error: #{e.message}")
      {
        result: nil,
        errors: [e.message]
      }
    rescue StandardError => e
      Rails.logger.error("Unexpected error in ImproveSketch: #{e.message}")
      Rails.logger.error(e.backtrace.join("\n"))
      {
        result: nil,
        errors: ["An unexpected error occurred: #{e.message}"]
      }
    end
  end
end

