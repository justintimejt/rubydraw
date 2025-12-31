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

