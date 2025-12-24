# frozen_string_literal: true

module Mutations
  class UpsertBoardSnapshot < Mutations::BaseMutation
    argument :id, ID, required: true
    argument :snapshot_json, Types::Json, required: true
    argument :title, String, required: false

    field :board, Types::BoardType, null: true
    field :errors, [String], null: false

    def resolve(id:, snapshot_json:, title: nil)
      user = context[:current_user] or raise GraphQL::ExecutionError, "Unauthorized"

      board = user.boards.find_or_initialize_by(id: id)
      board.title = title if title.present?
      board.snapshot_json = snapshot_json

      if board.save
        { board: board, errors: [] }
      else
        { board: nil, errors: board.errors.full_messages }
      end
    end
  end
end
