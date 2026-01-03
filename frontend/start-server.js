#!/usr/bin/env node
/**
 * Wrapper script to start react-router-serve with Cloud Run compatibility
 * Ensures the server listens on 0.0.0.0 and uses the PORT environment variable
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get port from environment or default to 8080
const port = process.env.PORT || '8080';

// Build the server entry point path
const serverPath = join(__dirname, 'build', 'server', 'index.js');

console.log(`Starting server on port ${port}, binding to 0.0.0.0`);

// Spawn react-router-serve with environment variables
const child = spawn('npx', ['react-router-serve', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PORT: port,
    // Some servers use HOST, others use HOSTNAME
    HOST: '0.0.0.0',
    HOSTNAME: '0.0.0.0',
  },
  shell: false,
});

child.on('error', (error) => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Server exited with code ${code}`);
  }
  process.exit(code || 0);
});

