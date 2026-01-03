#!/usr/bin/env node
/**
 * Custom server entry point for Cloud Run compatibility
 * Ensures the server listens on 0.0.0.0 and uses the PORT environment variable
 */

import { createServer } from 'node:http';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get port from environment or default to 8080
const port = parseInt(process.env.PORT || '8080', 10);
const host = process.env.HOST || '0.0.0.0';

console.log(`Starting server on ${host}:${port}`);

// Import the React Router server handler
const serverPath = join(__dirname, 'build', 'server', 'index.js');

try {
  // Import the server module (React Router exports a default request handler)
  const serverModule = await import(serverPath);
  const requestHandler = serverModule.default;
  
  if (typeof requestHandler !== 'function') {
    throw new Error('Server module does not export a default function');
  }
  
  // Create HTTP server with the request handler
  const server = createServer(requestHandler);
  
  server.listen(port, host, () => {
    console.log(`Server listening on http://${host}:${port}`);
  });
  
  server.on('error', (error) => {
    console.error('Server error:', error);
    process.exit(1);
  });
  
  // Handle graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
  
} catch (error) {
  console.error('Failed to start server:', error);
  console.error('Error details:', error.stack);
  process.exit(1);
}

