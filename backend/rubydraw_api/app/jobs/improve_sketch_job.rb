# frozen_string_literal: true

class ImproveSketchJob < ApplicationJob
  queue_as :improve_sketch

  # Job will retry on failure (default: 25 times over ~21 days)
  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(request_id:, png_base64:, svg: nil, hints: nil)
    # Ensure Redis pool is available (loaded from initializer)
    # Set status to running
    set_status(request_id, "running", started_at: Time.current.iso8601)

    begin
      # Call Gemini (will use cache if available)
      service = GeminiService.new
      result = service.improve_sketch(png_base64: png_base64, svg: svg, hints: hints)

      # Store result in Redis with 1 hour TTL
      REDIS_POOL.with do |redis|
        redis.setex(
          "improve_sketch:result:#{request_id}",
          1.hour.to_i,
          result.to_json
        )
      end

      # Mark as done
      set_status(request_id, "done", completed_at: Time.current.iso8601)
    rescue => e
      Rails.logger.error "[ImproveSketchJob] Error: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      
      # Store error
      REDIS_POOL.with do |redis|
        redis.setex(
          "improve_sketch:error:#{request_id}",
          1.hour.to_i,
          { message: e.message, class: e.class.name }.to_json
        )
      end

      # Mark as error
      set_status(request_id, "error", error: e.message, completed_at: Time.current.iso8601)
      
      # Re-raise to trigger retry mechanism
      raise
    end
  end

  private

  def set_status(request_id, status, **metadata)
    REDIS_POOL.with do |redis|
      key = "improve_sketch:status:#{request_id}"
      data = {
        status: status,
        updated_at: Time.current.iso8601
      }.merge(metadata)
      
      redis.setex(key, 1.hour.to_i, data.to_json)
    end
  end
end

