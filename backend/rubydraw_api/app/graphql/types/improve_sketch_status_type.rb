# frozen_string_literal: true

module Types
  class ImproveSketchStatusType < Types::BaseObject
    description "Status of an async Improve Sketch request"

    field :request_id, String, null: false
    field :status, String, null: false, description: "One of: queued, running, done, error, not_found"
    field :result, Types::ImproveSketchResultType, null: true, description: "Result if status is 'done'"
    field :error, String, null: true, description: "Error message if status is 'error'"
    field :created_at, String, null: true
    field :updated_at, String, null: true
  end
end

