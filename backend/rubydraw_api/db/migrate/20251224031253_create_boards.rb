class CreateBoards < ActiveRecord::Migration[8.1]
  def change
    enable_extension "pgcrypto" unless extension_enabled?("pgcrypto")

    create_table :boards, id: :uuid do |t|
      t.references :user, null: false, foreign_key: true, type: :uuid
      t.string :title, null: false, default: "Untitled"
      t.jsonb :snapshot_json, null: false, default: {}
      t.integer :schema_version, null: false, default: 1

      t.timestamps
    end

    add_index :boards, :updated_at
  end
end
