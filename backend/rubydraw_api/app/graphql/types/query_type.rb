# frozen_string_literal: true

module Types
  class QueryType < Types::BaseObject
    field :node, Types::NodeType, null: true, description: "Fetches an object given its ID." do
      argument :id, ID, required: true, description: "ID of the object."
    end

    def node(id:)
      context.schema.object_from_id(id, context)
    end

    field :nodes, [Types::NodeType, null: true], null: true, description: "Fetches a list of objects given a list of IDs." do
      argument :ids, [ID], required: true, description: "IDs of the objects."
    end

    def nodes(ids:)
      ids.map { |id| context.schema.object_from_id(id, context) }
    end

    field :boards, [Types::BoardType], null: false
    field :board, Types::BoardType, null: true do
      argument :id, ID, required: true
    end

    def boards
      user = context[:current_user] or raise GraphQL::ExecutionError, "Unauthorized"
      user.boards.order(updated_at: :desc)
    end

    def board(id:)
      user = context[:current_user] or raise GraphQL::ExecutionError, "Unauthorized"
      user.boards.find_by(id: id)
    end

    field :improve_sketch_status, Types::ImproveSketchStatusType, null: false, description: "Get the status and result of an async Improve Sketch request" do
      argument :request_id, String, required: true, description: "The request ID returned from async Improve Sketch mutation"
    end

    def improve_sketch_status(request_id:)
      status_data = nil
      result_data = nil
      error_data = nil

      REDIS_POOL.with do |redis|
        # Get status
        status_json = redis.get("improve_sketch:status:#{request_id}")
        status_data = JSON.parse(status_json) if status_json

        # Get result if done
        if status_data&.dig("status") == "done"
          result_json = redis.get("improve_sketch:result:#{request_id}")
          result_data = JSON.parse(result_json) if result_json
        end

        # Get error if error
        if status_data&.dig("status") == "error"
          error_json = redis.get("improve_sketch:error:#{request_id}")
          error_data = JSON.parse(error_json) if error_json
        end
      end

      {
        request_id: request_id,
        status: status_data&.dig("status") || "not_found",
        result: result_data ? {
          image_base64: result_data["image_base64"],
          title: result_data["title"],
          style: result_data["style"],
          palette: result_data["palette"],
          background: result_data["background"],
          notes: result_data["notes"]
        } : nil,
        error: error_data&.dig("message"),
        created_at: status_data&.dig("created_at"),
        updated_at: status_data&.dig("updated_at")
      }
    end
  end
end
