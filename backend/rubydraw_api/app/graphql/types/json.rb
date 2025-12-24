# frozen_string_literal: true

module Types
  class Json < GraphQL::Schema::Scalar
    description "Arbitrary JSON"

    def self.coerce_input(value, _ctx)
      value
    end

    def self.coerce_result(value, _ctx)
      value
    end
  end
end
