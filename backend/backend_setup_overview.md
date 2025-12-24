# Rubydraw Backend Plan (Rails + GraphQL) — Plain English

Goal: store board snapshots (JSON) from the frontend. Rails and GraphQL will expose two basics: load a board and save a board.

What you need installed:
- Ruby + Rails, PostgreSQL, and the `graphql` gem (add `graphql-batch` if you like, `bcrypt` if you use passwords).

Database shape:
- Table `boards` (id as UUID, belongs to a user).
- Columns: `title` (string, default “Untitled”), `snapshot_json` (jsonb, default `{}`), `schema_version` (int, default 1), timestamps. Index on `updated_at`.

Models:
- `Board` belongs to `User`.
- `User` has many `boards`.

GraphQL pieces (files live in `app/graphql` in a Rails app):
- `Types::Json` scalar: passes JSON through unchanged.
- `Types::BoardType`: exposes `id`, `title`, `snapshot_json`, `schema_version`, `created_at`, `updated_at`.
- Queries in `Types::QueryType`:
  - `boards`: current user’s boards, newest first.
  - `board(id)`: one board owned by the current user.
- Mutation in `Mutations::UpsertBoardSnapshot`:
  - Args: `id`, `snapshot_json`, optional `title`.
  - Finds or creates the board for the current user, saves the JSON, returns the board or errors.
- Register the mutation in `Types::MutationType`.
- Schema wires `query` and `mutation` into your schema class (e.g., `RubydrawSchema`).

Controller & route:
- `GraphqlController#execute` should pass `current_user` in the GraphQL context.
- Route: `POST /graphql` -> `graphql#execute`.
- If you don’t have auth yet, temporarily stub `current_user` (e.g., `User.first`) only for local testing.

What the frontend will call:
- Load: GraphQL query `board(id)` → returns `id`, `title`, `snapshotJson`, `updatedAt`.
- Save: GraphQL mutation `upsertBoardSnapshot(id, snapshotJson)` → returns `board { id updatedAt }` and `errors`.
- Conflict policy: last write wins (okay for MVP).

Board ID approach:
- Easiest: frontend generates UUIDs (e.g., `/b/:boardId`) and backend upserts by that id.
- Alternative: add a `createBoard` mutation later to generate ids server-side.

How to roll this out (step-by-step):
1) Add gems to `Gemfile` and run `bundle install`.
2) Run the GraphQL installer once if you don’t already have `app/graphql` and `GraphqlController`.
3) Create the migration for `boards` (UUID ids, jsonb column).
4) Add the `Board` model and `has_many :boards` on `User`.
5) Add the GraphQL types, query resolvers, and the upsert mutation.
6) Ensure `GraphqlController` includes `current_user` in `context` and route `/graphql`.
7) Test with a simple POST to `/graphql`:
   - Query `boards` (should return an empty array for a new user).
   - Mutation `upsertBoardSnapshot` with a small JSON payload; confirm row is created.

Future upgrades:
- Add `createBoard`, `renameBoard`, `deleteBoard`.
- Add version history table.
- Add ActiveStorage for assets.
- Add Sidekiq/jobs and realtime sync when needed.
