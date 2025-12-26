# Setting Up Supabase PostgreSQL for Backend

This guide will help you configure the Rails backend to use Supabase (cloud PostgreSQL) instead of local PostgreSQL.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in:
   - **Name**: Your project name (e.g., "rubydraw-api")
   - **Database Password**: Choose a strong password (save this!)
   - **Region**: Choose the closest region
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Connection String

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string**
3. Select **URI** tab
4. Copy the connection string (it looks like):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```

## Step 3: Configure Rails Backend

1. Open or create `.env` file in `backend/rubydraw_api/`:
   ```bash
   cd backend/rubydraw_api
   ```

2. Add your Supabase connection string:
   ```bash
   # Supabase Database Connection
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   
   # Gemini API Key (for improve sketch feature)
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

   **Important**: Replace `[YOUR-PASSWORD]` with the password you set when creating the project, and `[PROJECT-REF]` with your actual project reference.

3. Save the file

## Step 4: Create Database and Run Migrations

1. Run database setup:
   ```bash
   cd backend/rubydraw_api
   bin/rails db:create
   bin/rails db:migrate
   ```

   Or use the combined command:
   ```bash
   bin/rails db:prepare
   ```

## Step 5: Start the Rails Server

```bash
cd backend/rubydraw_api
bin/rails server
```

The backend will now connect to Supabase instead of local PostgreSQL!

## Troubleshooting

### Connection Issues

If you get connection errors:
1. Verify your `DATABASE_URL` is correct in `.env`
2. Check that your Supabase project is active
3. Make sure the password in the connection string matches your Supabase database password
4. Check Supabase dashboard for any connection restrictions

### SSL Connection Issues

If you get SSL errors, Supabase requires SSL. The connection string should work, but if needed, you can add SSL parameters:
```
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres?sslmode=require
```

### Finding Your Project Reference

Your project reference is in the Supabase dashboard URL:
- Dashboard URL: `https://app.supabase.com/project/[PROJECT-REF]`
- The `[PROJECT-REF]` is the part after `/project/`

## Benefits of Using Supabase

- ✅ No local PostgreSQL setup needed
- ✅ Accessible from anywhere
- ✅ Automatic backups
- ✅ Easy to share with team members
- ✅ Free tier available
- ✅ Built-in database management UI

## Switching Back to Local PostgreSQL

If you want to switch back to local PostgreSQL:
1. Remove or comment out `DATABASE_URL` from `.env`
2. Make sure local PostgreSQL is running
3. Restart the Rails server

