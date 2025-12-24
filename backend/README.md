# Backend

Rails 8 + GraphQL API lives in `rubydraw_api/` (Ruby 3.2.2, PostgreSQL).

Quick start (after Postgres is running):
```bash
cd rubydraw_api
bundle install
bin/rails db:prepare   # create DB + run migrations
bin/rails server
```

GraphQL endpoint: `POST /graphql` (uses a stub `current_user` creating `demo@example.com` if missing).
