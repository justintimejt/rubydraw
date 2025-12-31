# How Redis Works in This Implementation

## Redis Has THREE Roles Here

### 1. **Cache Store** (via Rails.cache)
**Purpose:** Avoid expensive Gemini API calls for identical inputs

**How it works:**
- When `GeminiService.improve_sketch()` is called, it first checks Redis cache
- Cache key = SHA256 hash of (PNG + SVG + hints)
- If found → return cached result immediately (no API call)
- If not found → call Gemini API, then store result in Redis with 7-day TTL

**Example:**
```ruby
# First call: Cache MISS → calls Gemini API → stores in Redis
result1 = service.improve_sketch(png: "abc123", svg: "path...")

# Second call (same inputs): Cache HIT → returns from Redis (no API call!)
result2 = service.improve_sketch(png: "abc123", svg: "path...")
```

**Redis structure:**
```
Key: "improve_sketch:v1:abc123def456..."
Value: { image_base64: "...", title: "...", ... }
TTL: 7 days
```

---

### 2. **Job Queue Backend** (via Sidekiq)
**Purpose:** Process expensive Gemini calls asynchronously so the API doesn't block

**How it works:**
- **Sidekiq uses Redis as its queue storage** (this is how Sidekiq works internally)
- When you call `ImproveSketchJob.perform_later(...)`, Sidekiq:
  1. Serializes the job data
  2. Pushes it to a Redis list (queue) like `queue:improve_sketch`
  3. Returns immediately (non-blocking)
- Sidekiq workers (separate processes) continuously:
  1. Poll Redis for jobs in the queue
  2. Pull jobs from Redis
  3. Execute the job
  4. Remove job from Redis when done

**Redis structure (managed by Sidekiq):**
```
queue:improve_sketch → [job1, job2, job3]  (Redis LIST)
queue:default → [job4, job5]              (Redis LIST)
```

**Flow:**
```
GraphQL Mutation
  ↓
ImproveSketchJob.perform_later(...)
  ↓
Sidekiq pushes job to Redis queue
  ↓ (returns immediately)
GraphQL returns { request_id: "..." }
  ↓ (meanwhile, in background)
Sidekiq worker pulls job from Redis
  ↓
Executes ImproveSketchJob#perform
  ↓
Calls GeminiService (which uses cache!)
  ↓
Stores result in Redis (see #3 below)
```

---

### 3. **Status/Result Storage** (direct Redis access)
**Purpose:** Store job status and results so frontend can poll for completion

**How it works:**
- When job starts: Store `status: "queued"` in Redis
- When job runs: Update to `status: "running"`
- When job completes: Store result + `status: "done"`
- If error: Store error message + `status: "error"`
- Frontend polls GraphQL query `improveSketchStatus(requestId)` which reads from Redis

**Redis structure:**
```
Key: "improve_sketch:status:uuid-123"
Value: { status: "done", updated_at: "2024-01-01T12:00:00Z" }
TTL: 1 hour

Key: "improve_sketch:result:uuid-123"
Value: { image_base64: "...", title: "...", ... }
TTL: 1 hour

Key: "improve_sketch:error:uuid-123"  (only if error)
Value: { message: "API timeout", class: "Faraday::TimeoutError" }
TTL: 1 hour
```

---

## Visual Flow: Async Path

```
┌─────────────────┐
│  Frontend       │
│  (tldraw)       │
└────────┬────────┘
         │
         │ GraphQL: improveSketch(async: true)
         ↓
┌─────────────────┐
│ GraphQL Mutation│
│ ImproveSketch   │
└────────┬────────┘
         │
         │ 1. Generate request_id
         │ 2. Store status in Redis: "queued"
         │ 3. Sidekiq.enqueue(job)
         ↓
    ┌────┴────┐
    │         │
    ↓         ↓
┌─────────┐ ┌──────────────────┐
│ Returns │ │ Sidekiq pushes   │
│ {       │ │ job to Redis     │
│  request│ │ queue            │
│  _id    │ │                  │
│ }       │ └────────┬─────────┘
└─────────┘          │
                     │ (background)
                     ↓
              ┌──────────────┐
              │ Redis Queue  │
              │ (Sidekiq)    │
              └──────┬───────┘
                     │
                     │ Worker pulls job
                     ↓
              ┌──────────────┐
              │ Sidekiq      │
              │ Worker       │
              └──────┬───────┘
                     │
                     │ Update status: "running"
                     ↓
              ┌──────────────┐
              │ GeminiService│
              │ .improve_    │
              │ sketch()     │
              └──────┬───────┘
                     │
         ┌───────────┴───────────┐
         │                       │
         ↓                       ↓
    ┌─────────┐            ┌─────────┐
    │ Check   │            │ Call    │
    │ Cache   │            │ Gemini  │
    │ (Redis) │            │ API     │
    └────┬────┘            └────┬────┘
         │                      │
         │ Cache HIT            │ Cache MISS
         │ (return cached)      │ (call API, then cache)
         └──────────┬───────────┘
                    │
                    ↓
              ┌──────────────┐
              │ Store result │
              │ in Redis     │
              │ (status: done)│
              └──────────────┘
                    │
                    │ Frontend polls
                    ↓
              ┌──────────────┐
              │ GraphQL Query│
              │ improveSketch│
              │ Status       │
              └──────────────┘
                    │
                    │ Reads from Redis
                    ↓
              ┌──────────────┐
              │ Returns      │
              │ { status,    │
              │   result }   │
              └──────────────┘
```

---

## Key Points

1. **Sidekiq IS using Redis as a queue** - Sidekiq doesn't have its own queue system; it uses Redis lists to store jobs
2. **Three separate uses of Redis:**
   - Cache (via Rails.cache) - for API results
   - Queue (via Sidekiq) - for job management
   - Storage (direct) - for status/results
3. **All in one Redis instance** - You can use the same Redis server for all three, just different keys/namespaces
4. **TTLs prevent growth** - Cache: 7 days, Status: 1 hour (auto-cleanup)

---

## Why Not Use solid_queue?

Your Rails 8 app already has `solid_queue` (database-backed queue). We're using Sidekiq instead because:

- **Sidekiq is more mature** for production workloads
- **Better monitoring** (Sidekiq Web UI)
- **More control** over retries, priorities, etc.
- **Redis is faster** than database for queue operations
- **Already using Redis** for cache and ActionCable

You could use `solid_queue` instead, but Sidekiq is the industry standard for Redis-backed job queues.

---

## Summary

**Redis serves as:**
1. ✅ **Cache** - Store API results (avoid duplicate calls)
2. ✅ **Queue** - Sidekiq uses Redis to store/manage job queues
3. ✅ **Storage** - Store job status and results temporarily

**It's NOT just caching** - Redis is the backbone for the entire async job system via Sidekiq!

