# Backend

Rails 8 + GraphQL API lives in `rubydraw_api/` (Ruby 3.2.2, PostgreSQL).

## Quick Start

### Option 1: Using Supabase (Recommended - No Local PostgreSQL Needed)

1. **Set up Supabase** (see `rubydraw_api/SETUP_SUPABASE.md` for detailed instructions):
   - Create a project at [supabase.com](https://supabase.com)
   - Get your connection string from Settings → Database
   - Add to `.env` file:
     ```bash
     cd rubydraw_api
     cp .env.example .env
     # Edit .env and add your DATABASE_URL and GEMINI_API_KEY
     ```

2. **Install dependencies and setup**:
   ```bash
   cd rubydraw_api
   bundle install
   bin/rails db:prepare   # create DB + run migrations
   bin/rails server
   ```

### Option 2: Using Local PostgreSQL

1. **Start PostgreSQL** (if not running):
   ```bash
   brew services start postgresql@14  # or your version
   ```

2. **Install dependencies and setup**:
   ```bash
   cd rubydraw_api
   bundle install
   bin/rails db:prepare   # create DB + run migrations
   bin/rails server
   ```

## Environment Variables

Create a `.env` file in `rubydraw_api/` (see `.env.example`):
- `DATABASE_URL` - PostgreSQL connection string (optional, uses local if not set)
- `GEMINI_API_KEY` - Required for the improve sketch feature

GraphQL endpoint: `POST /graphql` (uses a stub `current_user` creating `demo@example.com` if missing).
