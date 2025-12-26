#!/usr/bin/env ruby
require 'dotenv'
Dotenv.load

puts "DATABASE_URL present: #{ENV['DATABASE_URL'].present?}"
puts "DATABASE_URL value: #{ENV['DATABASE_URL']&.gsub(/:[^:@]+@/, ':****@') || 'NOT SET'}"
puts "GEMINI_API_KEY present: #{ENV['GEMINI_API_KEY'].present?}"
