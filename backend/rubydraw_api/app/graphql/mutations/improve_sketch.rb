# frozen_string_literal: true

module Mutations
  class ImproveSketch < Mutations::BaseMutation
    description "Improve a rough sketch by sending PNG image to Gemini API for cleaning and repair"

    # Define arguments directly - RelayClassicMutation will auto-generate the input type
    argument :png_base64, String, required: true, description: "The input PNG image as base64 string"
    argument :svg, String, required: false, description: "Optional SVG string for structural hints"
    argument :hints, String, required: false, description: "Optional hints for the improvement process"
    argument :async, Boolean, required: false, default_value: false, description: "If true, process asynchronously and return requestId"

    field :result, Types::ImproveSketchResultType, null: true, description: "The improved sketch result (null if async)"
    field :request_id, String, null: true, description: "Request ID for async processing (null if sync)"
    field :errors, [String], null: false, description: "List of errors if the operation failed"

    def resolve(png_base64:, svg: nil, hints: nil, async: false)
      # No authentication required for MVP, but can add later
      # user = context[:current_user] or raise GraphQL::ExecutionError, "Unauthorized"

      if async
        # Generate request ID
        request_id = SecureRandom.uuid
        
        # Set initial status
        REDIS_POOL.with do |redis|
          redis.setex(
            "improve_sketch:status:#{request_id}",
            1.hour.to_i,
            { status: "queued", created_at: Time.current.iso8601 }.to_json
          )
        end

        # Enqueue job
        ImproveSketchJob.perform_later(
          request_id: request_id,
          png_base64: png_base64,
          svg: svg,
          hints: hints
        )

        {
          result: nil,
          request_id: request_id,
          errors: []
        }
      else
        # Synchronous path (existing behavior, with caching)
        service = GeminiService.new
        result = service.improve_sketch(png_base64: png_base64, svg: svg, hints: hints)

        {
          result: {
            image_base64: result[:image_base64],
            title: result[:title],
            style: result[:style],
            palette: result[:palette],
            background: result[:background],
            notes: result[:notes]
          },
          request_id: nil,
          errors: []
        }
      end
    rescue GeminiService::Error => e
      error_message = "Gemini service error: #{e.message}"
      Rails.logger.error(error_message)
      puts "[ImproveSketch] #{error_message}"
      puts "[ImproveSketch] Error class: #{e.class.name}"
      {
        result: nil,
        request_id: nil,
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
        request_id: nil,
        errors: ["An unexpected error occurred: #{e.message}"]
      }
    end
  end
end

