# Redis Implementation Plan for RubyDraw

This document outlines the incremental implementation of Redis for caching Gemini results and running background jobs for the Improve Sketch feature.

## Overview

**Current State:**
- Rails 8.1.1 with `solid_cache`, `solid_queue`, `solid_cable`
- `GeminiService` calls Gemini API synchronously in GraphQL mutation
- ActionCable already configured to use Redis in production
- No caching layer for expensive Gemini API calls

**Goal:**
1. **Step 1**: Add Redis cache store + cache Gemini results (sync path)
2. **Step 2**: Add Sidekiq for async Improve Sketch jobs
3. **Step 3** (Optional): ActionCable realtime status updates

---

## Step 1 — Add Redis Dependencies and Configuration

### 1.1 Add Gems

Edit `Gemfile` and add:

```ruby
# Redis for caching and background jobs
gem "redis", "~> 5.0"
gem "connection_pool", "~> 2.4"
gem "sidekiq", "~> 7.0"
```

Run:
```bash
bundle install
```

### 1.2 Create Redis Initializer

Create `config/initializers/redis.rb`:

```ruby
# frozen_string_literal: true

# Redis connection pool for direct Redis access (Sidekiq, custom caching, etc.)
REDIS_POOL = ConnectionPool.new(size: ENV.fetch("REDIS_POOL_SIZE", 5).to_i) do
  Redis.new(url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"))
end

# Test connection on boot (optional, but helpful for debugging)
begin
  REDIS_POOL.with { |redis| redis.ping }
  Rails.logger.info "[Redis] Connected successfully"
rescue => e
  Rails.logger.warn "[Redis] Connection failed: #{e.message}"
end
```

### 1.3 Configure Rails Cache Store

**Development** (`config/environments/development.rb`):

```ruby
# Replace memory_store with Redis cache store
if ENV["REDIS_URL"].present?
  config.cache_store = :redis_cache_store, {
    url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0"),
    namespace: "rubydraw_cache",
    expires_in: 7.days,
    pool_size: ENV.fetch("REDIS_POOL_SIZE", 5).to_i,
    pool_timeout: 5
  }
else
  config.cache_store = :memory_store
end
```

**Production** (`config/environments/production.rb`):

```ruby
# Uncomment and configure Redis cache store
config.cache_store = :redis_cache_store, {
  url: ENV.fetch("REDIS_URL"),
  namespace: "rubydraw_cache",
  expires_in: 7.days,
  pool_size: ENV.fetch("REDIS_POOL_SIZE", 10).to_i,
  pool_timeout: 5,
  reconnect_attempts: 3
}
```

---

## Step 2 — Cache Gemini Results (Sync Path)

### 2.1 Update GeminiService with Caching

Edit `app/services/gemini_service.rb`:

Add a cache key generation method (add `require 'digest'` at the top of the file if not already present):

```ruby
private

def cache_key(png_base64:, svg: nil, hints: nil)
  # Create a digest of inputs for cache key
  # Use full PNG base64 for accurate cache hits
  input_string = "#{png_base64}:#{svg || ''}:#{hints || ''}"
  digest = Digest::SHA256.hexdigest(input_string)
  "improve_sketch:v1:#{digest}"
end
```

Wrap the API call in `improve_sketch` method:

```ruby
def improve_sketch(png_base64:, svg: nil, hints: nil)
  puts "[GeminiService] Starting improve_sketch"
  puts "[GeminiService] PNG base64 length: #{png_base64.length}"
  puts "[GeminiService] SVG provided: #{svg.present?}"
  puts "[GeminiService] Hints: #{hints || 'none'}"

  cache_key = cache_key(png_base64: png_base64, svg: svg, hints: hints)
  
  # Try cache first
  cached_result = Rails.cache.read(cache_key)
  if cached_result
    puts "[GeminiService] Cache HIT for key: #{cache_key[0..50]}..."
    return cached_result
  end

  puts "[GeminiService] Cache MISS, calling API..."
  
  user_message = build_user_message(svg, hints)
  response = call_api(user_message, png_base64)
  result = parse_response(response)

  # Cache the result (7 days TTL)
  Rails.cache.write(cache_key, result, expires_in: 7.days)
  puts "[GeminiService] Result cached with key: #{cache_key[0..50]}..."

  result
rescue Faraday::TimeoutError => e
  # ... existing error handling ...
rescue => e
  # ... existing error handling ...
end
```

**Note:** The cache key uses a digest of inputs. Same PNG + same SVG + same hints = cache hit. Different inputs = cache miss.

### 2.2 Test Caching

Manual test:
1. Call Improve Sketch with same inputs twice
2. First call should hit API (cache miss)
3. Second call should return cached result (cache hit, no API call)

---

## Step 3 — Add Sidekiq for Async Jobs

### 3.1 Configure Sidekiq

Create `config/sidekiq.yml`:

```yaml
:concurrency: <%= ENV.fetch("SIDEKIQ_CONCURRENCY", 5).to_i %>
:queues:
  - default
  - improve_sketch

:timeout: 300

# Development: log to stdout
:logfile: ./log/sidekiq.log
```

Create `config/initializers/sidekiq.rb`:

```ruby
# frozen_string_literal: true

Sidekiq.configure_server do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end

Sidekiq.configure_client do |config|
  config.redis = { url: ENV.fetch("REDIS_URL", "redis://localhost:6379/0") }
end
```

### 3.2 Create Improve Sketch Job

Create `app/jobs/improve_sketch_job.rb`:

```ruby
# frozen_string_literal: true

# Note: If ApplicationJob doesn't exist, inherit from ActiveJob::Base
# Check app/jobs/application_job.rb or create it if needed
class ImproveSketchJob < ApplicationJob
  queue_as :improve_sketch

  # Job will retry on failure (default: 25 times over ~21 days)
  retry_on StandardError, wait: :exponentially_longer, attempts: 3

  def perform(request_id:, png_base64:, svg: nil, hints: nil)
    # Ensure Redis pool is available (loaded from initializer)
    # Set status to running
    set_status(request_id, "running", started_at: Time.current.iso8601)

    begin
      # Call Gemini (will use cache if available)
      service = GeminiService.new
      result = service.improve_sketch(png_base64: png_base64, svg: svg, hints: hints)

      # Store result in Redis with 1 hour TTL
      REDIS_POOL.with do |redis|
        redis.setex(
          "improve_sketch:result:#{request_id}",
          1.hour.to_i,
          result.to_json
        )
      end

      # Mark as done
      set_status(request_id, "done", completed_at: Time.current.iso8601)
    rescue => e
      Rails.logger.error "[ImproveSketchJob] Error: #{e.class} - #{e.message}"
      Rails.logger.error e.backtrace.join("\n")
      
      # Store error
      REDIS_POOL.with do |redis|
        redis.setex(
          "improve_sketch:error:#{request_id}",
          1.hour.to_i,
          { message: e.message, class: e.class.name }.to_json
        )
      end

      # Mark as error
      set_status(request_id, "error", error: e.message, completed_at: Time.current.iso8601)
      
      # Re-raise to trigger retry mechanism
      raise
    end
  end

  private

  def set_status(request_id, status, **metadata)
    REDIS_POOL.with do |redis|
      key = "improve_sketch:status:#{request_id}"
      data = {
        status: status,
        updated_at: Time.current.iso8601
      }.merge(metadata)
      
      redis.setex(key, 1.hour.to_i, data.to_json)
    end
  end
end
```

### 3.3 Update GraphQL Mutation for Async

Edit `app/graphql/mutations/improve_sketch.rb`:

Add the `request_id` field to the mutation:

```ruby
field :request_id, String, null: true, description: "Request ID for async processing (null if sync)"
```

Add a new argument to control sync vs async:

```ruby
argument :async, Boolean, required: false, default_value: false, description: "If true, process asynchronously and return requestId"
```

Update the `resolve` method:

```ruby
def resolve(png_base64:, svg: nil, hints: nil, async: false)
  if async
    # Generate request ID
    request_id = SecureRandom.uuid
    
    # Set initial status
    REDIS_POOL.with do |redis|
      redis.setex(
        "improve_sketch:status:#{request_id}",
        1.hour.to_i,
        { status: "queued", created_at: Time.current.iso8601 }.to_json
      )
    end

    # Enqueue job
    ImproveSketchJob.perform_later(
      request_id: request_id,
      png_base64: png_base64,
      svg: svg,
      hints: hints
    )

    {
      result: nil,
      request_id: request_id,
      errors: []
    }
  else
    # Synchronous path (existing behavior, with caching)
    service = GeminiService.new
    result = service.improve_sketch(png_base64: png_base64, svg: svg, hints: hints)

    {
      result: {
        image_base64: result[:image_base64],
        title: result[:title],
        style: result[:style],
        palette: result[:palette],
        background: result[:background],
        notes: result[:notes]
      },
      request_id: nil,
      errors: []
    }
  end
rescue => e
  # ... existing error handling ...
end
```

### 3.4 Add Status Query

Add the status query field to `app/graphql/types/query_type.rb`:

```ruby
field :improve_sketch_status, Types::ImproveSketchStatusType, null: false, description: "Get the status and result of an async Improve Sketch request" do
  argument :request_id, String, required: true, description: "The request ID returned from async Improve Sketch mutation"
end

def improve_sketch_status(request_id:)
  status_data = nil
  result_data = nil
  error_data = nil

  REDIS_POOL.with do |redis|
    # Get status
    status_json = redis.get("improve_sketch:status:#{request_id}")
    status_data = JSON.parse(status_json) if status_json

    # Get result if done
    if status_data&.dig("status") == "done"
      result_json = redis.get("improve_sketch:result:#{request_id}")
      result_data = JSON.parse(result_json) if result_json
    end

    # Get error if error
    if status_data&.dig("status") == "error"
      error_json = redis.get("improve_sketch:error:#{request_id}")
      error_data = JSON.parse(error_json) if error_json
    end
  end

  {
    request_id: request_id,
    status: status_data&.dig("status") || "not_found",
    result: result_data ? {
      image_base64: result_data["image_base64"],
      title: result_data["title"],
      style: result_data["style"],
      palette: result_data["palette"],
      background: result_data["background"],
      notes: result_data["notes"]
    } : nil,
    error: error_data&.dig("message"),
    created_at: status_data&.dig("created_at"),
    updated_at: status_data&.dig("updated_at")
  }
end
```

Create `app/graphql/types/improve_sketch_status_type.rb`:

```ruby
# frozen_string_literal: true

module Types
  class ImproveSketchStatusType < Types::BaseObject
    description "Status of an async Improve Sketch request"

    field :request_id, String, null: false
    field :status, String, null: false, description: "One of: queued, running, done, error, not_found"
    field :result, Types::ImproveSketchResultType, null: true, description: "Result if status is 'done'"
    field :error, String, null: true, description: "Error message if status is 'error'"
    field :created_at, String, null: true
    field :updated_at, String, null: true
  end
end
```

The query is automatically registered since it's added to `Types::QueryType`.

### 3.5 Update Mutation to Return request_id

The mutation already returns a hash with `result` and `errors`. We'll add `request_id` to that hash. The mutation resolver already handles this in Step 3.3 above.

**Note:** The `request_id` is returned at the mutation level, not inside the `result` object. When `async: true`, `result` will be `null` and `request_id` will be populated. When `async: false`, `result` will be populated and `request_id` will be `null`.

---

## Step 4 — Update Environment Checker

Edit `check_env.rb`:

```ruby
#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

puts "DATABASE_URL present: #{ENV['DATABASE_URL'].present?}"
puts "DATABASE_URL value: #{ENV['DATABASE_URL']&.gsub(/:[^:@]+@/, ':****@') || 'NOT SET'}"

puts "GEMINI_API_KEY present: #{ENV['GEMINI_API_KEY'].present?}"

puts "REDIS_URL present: #{ENV['REDIS_URL'].present?}"
if ENV['REDIS_URL']
  # Mask password if present (format: redis://:password@host:port/db)
  masked = ENV['REDIS_URL'].gsub(/:\/\/[^:@]+:[^@]+@/, '://****:****@')
  puts "REDIS_URL value: #{masked}"
else
  puts "REDIS_URL value: NOT SET (will use default: redis://localhost:6379/0)"
end

puts "SIDEKIQ_CONCURRENCY: #{ENV['SIDEKIQ_CONCURRENCY'] || 'NOT SET (default: 5)'}"
```

---

## Step 5 (Optional) — ActionCable Realtime Updates

If you want realtime status updates without polling:

### 5.1 Create Channel

Create `app/channels/improve_sketch_channel.rb`:

```ruby
# frozen_string_literal: true

class ImproveSketchChannel < ApplicationCable::Channel
  def subscribed
    request_id = params[:request_id]
    stream_from "improve_sketch:#{request_id}"
  end

  def unsubscribed
    # Any cleanup needed
  end
end
```

### 5.2 Broadcast from Job

Update `ImproveSketchJob` to broadcast:

```ruby
def set_status(request_id, status, **metadata)
  # ... existing Redis code ...
  
  # Broadcast via ActionCable
  ActionCable.server.broadcast(
    "improve_sketch:#{request_id}",
    { status: status, **metadata }
  )
end
```

### 5.3 Frontend Subscription

Frontend can subscribe to the channel and update UI in real-time.

---

## Local Development Setup

### Prerequisites

1. **Install Redis:**
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Docker
   docker run -d -p 6379:6379 redis:7-alpine
   ```

2. **Set Environment Variables:**
   ```bash
   # .env file
   REDIS_URL=redis://localhost:6379/0
   SIDEKIQ_CONCURRENCY=5
   ```

### Running Services

1. **Start Redis** (if not using brew services):
   ```bash
   redis-server
   ```

2. **Start Sidekiq** (in a separate terminal):
   ```bash
   cd backend/rubydraw_api
   bundle exec sidekiq -C config/sidekiq.yml
   ```

3. **Start Rails Server:**
   ```bash
   rails server
   ```

### Testing

1. **Test Cache:**
   - Call Improve Sketch mutation twice with same inputs
   - Check logs for "Cache HIT" on second call

2. **Test Async:**
   - Call Improve Sketch with `async: true`
   - Get `requestId` back immediately
   - Poll `improveSketchStatus` query until status is "done"
   - Verify result is returned

3. **Test Sidekiq:**
   - Check Sidekiq web UI (if enabled) at `/sidekiq`
   - Or check Sidekiq logs for job processing

---

## Deployment Notes

1. **Redis URL:** Set `REDIS_URL` in production environment
2. **Sidekiq:** Run Sidekiq as a separate process/service
3. **Connection Pool:** Adjust `REDIS_POOL_SIZE` based on load
4. **TTL:** Review cache and status TTLs (currently 7 days for cache, 1 hour for status)

---

## Rollback Plan

If issues arise:

1. **Disable caching:** Set `REDIS_URL` to empty, falls back to memory_store
2. **Disable async:** Frontend can use `async: false` to use sync path
3. **Remove Sidekiq:** Comment out job enqueue, use sync path only

---

## Next Steps

1. ✅ Add Redis gems and initializer
2. ✅ Configure cache store
3. ✅ Add caching to GeminiService
4. ✅ Add Sidekiq job
5. ✅ Update GraphQL mutation
6. ✅ Add status query
7. ✅ Update check_env.rb
8. ⏭️ (Optional) Add ActionCable realtime updates
9. ⏭️ (Optional) Add Sidekiq web UI
10. ⏭️ (Optional) Add monitoring/alerting

---

## Files to Create/Modify

**New Files:**
- `config/initializers/redis.rb`
- `config/sidekiq.yml`
- `config/initializers/sidekiq.rb`
- `app/jobs/improve_sketch_job.rb`
- `app/graphql/types/improve_sketch_status_type.rb`
- `app/channels/improve_sketch_channel.rb` (optional)

**Modified Files:**
- `Gemfile`
- `config/environments/development.rb`
- `config/environments/production.rb`
- `app/services/gemini_service.rb`
- `app/graphql/mutations/improve_sketch.rb`
- `app/graphql/types/query_type.rb` (add improve_sketch_status field)
- `app/graphql/types/improve_sketch_result_type.rb` (add request_id field)
- `check_env.rb`

