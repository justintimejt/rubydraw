# Troubleshooting Database Connection

## Issue: Still connecting to local PostgreSQL after adding Supabase DATABASE_URL

### Step 1: Verify .env file location and content

The `.env` file must be in the `backend/rubydraw_api/` directory (same level as `Gemfile`).

Check your `.env` file:
```bash
cd backend/rubydraw_api
cat .env
```

It should contain:
```bash
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
GEMINI_API_KEY=your_key_here
```

### Step 2: Restart the Rails server

**Important**: After adding/changing `.env` file, you MUST restart the Rails server:

1. Stop the current server (Ctrl+C in the terminal running `rails server`)
2. Start it again:
   ```bash
   cd backend/rubydraw_api
   bin/rails server
   ```

### Step 3: Verify DATABASE_URL is being loaded

You can check if Rails is reading the DATABASE_URL:

```bash
cd backend/rubydraw_api
bin/rails runner "puts ENV['DATABASE_URL']&.gsub(/:[^:@]+@/, ':****@') || 'NOT SET'"
```

This should print your Supabase connection string (with password masked).

### Step 4: Check Rails logs

When you start the server, check the logs. If it's connecting to Supabase, you won't see socket errors.

If you still see errors about `/tmp/.s.PGSQL.5432`, the DATABASE_URL is not being loaded.

### Common Issues:

1. **Server not restarted**: Most common issue - restart the server after changing .env
2. **Wrong .env location**: Must be in `backend/rubydraw_api/.env`, not in parent directories
3. **Syntax error in .env**: Make sure there are no quotes around the DATABASE_URL value
4. **Missing dotenv-rails**: Should be in Gemfile (it is), but make sure `bundle install` was run

### Quick Test:

Run this to verify everything:
```bash
cd backend/rubydraw_api
bin/rails runner "puts 'DATABASE_URL: ' + (ENV['DATABASE_URL'].present? ? 'SET' : 'NOT SET')"
```

If it says "NOT SET", the .env file is not being loaded. Check:
- File location
- File name (must be exactly `.env`)
- Restart the server




