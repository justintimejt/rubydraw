# frozen_string_literal: true

module Types
  class MutationType < Types::BaseObject
    field :upsert_board_snapshot, mutation: Mutations::UpsertBoardSnapshot
    field :improve_sketch, mutation: Mutations::ImproveSketch
  end
end
