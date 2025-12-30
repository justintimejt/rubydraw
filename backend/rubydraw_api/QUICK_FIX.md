# Quick Fix: Default to Local PostgreSQL

The error shows Rails is trying to connect to the database. Since the `improve_sketch` mutation doesn't actually need the database, here's the quickest fix:

## Option 1: Remove DATABASE_URL (Use Local PostgreSQL)

1. **Comment out or remove DATABASE_URL from `.env`**:
   ```bash
   cd backend/rubydraw_api
   # Edit .env and comment out or remove the DATABASE_URL line:
   # DATABASE_URL=...
   ```

2. **Start local PostgreSQL** (if not running):
   ```bash
   brew services start postgresql@14
   # or whatever version you have
   ```

3. **Create local database**:
   ```bash
   cd backend/rubydraw_api
   bin/rails db:create
   bin/rails db:migrate
   ```

4. **Restart Rails server**:
   ```bash
   bin/rails server
   ```

## Option 2: Fix Supabase Connection

If you want to use Supabase:

1. **Verify your `.env` file** has the correct DATABASE_URL:
   ```bash
   cd backend/rubydraw_api
   cat .env
   ```
   
   Should have:
   ```
   DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@db.YOUR_PROJECT_REF.supabase.co:5432/postgres
   ```

2. **Test the connection**:
   ```bash
   bin/rails runner "ActiveRecord::Base.establish_connection; puts 'Connected!'"
   ```

3. **If connection fails**, check:
   - Password is correct
   - Project reference is correct
   - Supabase project is active

4. **Restart Rails server** after fixing:
   ```bash
   bin/rails server
   ```

## Current Status

The code has been updated to:
- Default to local PostgreSQL in `database.yml`
- Handle database connection errors gracefully in `GraphqlController`
- Allow the `improve_sketch` mutation to work even if database connection fails

**However**, Rails still tries to establish a database connection on startup. So you need either:
- Local PostgreSQL running, OR
- Valid Supabase DATABASE_URL

The easiest path forward: **Remove DATABASE_URL from .env and start local PostgreSQL**.




