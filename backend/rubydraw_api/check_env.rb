#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

# Helper method to check if a string is present (non-nil and non-empty)
def present?(str)
  str && !str.strip.empty?
end

puts "DATABASE_URL present: #{present?(ENV['DATABASE_URL'])}"
puts "DATABASE_URL value: #{ENV['DATABASE_URL']&.gsub(/:[^:@]+@/, ':****@') || 'NOT SET'}"

puts "GEMINI_API_KEY present: #{present?(ENV['GEMINI_API_KEY'])}"

puts "REDIS_URL present: #{present?(ENV['REDIS_URL'])}"
if present?(ENV['REDIS_URL'])
  # Mask password if present (format: redis://:password@host:port/db)
  masked = ENV['REDIS_URL'].gsub(/:\/\/[^:@]+:[^@]+@/, '://****:****@')
  puts "REDIS_URL value: #{masked}"
else
  puts "REDIS_URL value: NOT SET (will use default: redis://localhost:6379/0)"
end

puts "SIDEKIQ_CONCURRENCY: #{ENV['SIDEKIQ_CONCURRENCY'] || 'NOT SET (default: 5)'}"
