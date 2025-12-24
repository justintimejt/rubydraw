# frozen_string_literal: true

module Types
  class BoardType < Types::BaseObject
    field :id, ID, null: false
    field :title, String, null: false
    field :snapshot_json, Types::Json, null: false
    field :schema_version, Integer, null: false
    field :updated_at, GraphQL::Types::ISO8601DateTime, null: false
    field :created_at, GraphQL::Types::ISO8601DateTime, null: false
  end
end
