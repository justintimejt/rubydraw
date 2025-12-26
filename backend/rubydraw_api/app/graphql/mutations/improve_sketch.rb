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
          display_svg: result[:displaySvg],
          extrusion_path: result[:extrusionPath],
          is_closed: result[:isClosed],
          suggested_depth: result[:suggestedDepth],
          suggested_bevel: result[:suggestedBevel],
          palette: result[:palette],
          notes: result[:notes]
        },
        errors: []
      }
    rescue GeminiService::Error => e
      error_message = "Gemini service error: #{e.message}"
      Rails.logger.error(error_message)
      puts "[ImproveSketch] #{error_message}"
      puts "[ImproveSketch] Error class: #{e.class.name}"
      {
        result: nil,
        errors: [e.message]
      }
    rescue StandardError => e
      error_message = "Unexpected error in ImproveSketch: #{e.message}"
      Rails.logger.error(error_message)
      Rails.logger.error(e.backtrace.join("\n"))
      puts "[ImproveSketch] #{error_message}"
      puts "[ImproveSketch] Error class: #{e.class.name}"
      puts "[ImproveSketch] Backtrace: #{e.backtrace.first(10).join("\n")}"
      {
        result: nil,
        errors: ["An unexpected error occurred: #{e.message}"]
      }
    end
  end
end

