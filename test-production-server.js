#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Testing production server...');

// Verify dist directory and files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
if (missingFiles.length > 0) {
  console.error('Missing required files:', missingFiles);
  process.exit(1);
}

console.log('✅ All required files present');

// Test server startup (brief test)
console.log('Testing server startup...');

const serverProcess = spawn('node', ['dist/index.js'], {
  cwd: process.cwd(),
  env: { ...process.env, NODE_ENV: 'production', PORT: '3001' },
  stdio: ['pipe', 'pipe', 'pipe']
});

let serverOutput = '';
let serverStarted = false;

serverProcess.stdout.on('data', (data) => {
  serverOutput += data.toString();
  if (data.toString().includes('serving on port') || data.toString().includes('running on port')) {
    serverStarted = true;
    console.log('✅ Server started successfully');
    serverProcess.kill();
  }
});

serverProcess.stderr.on('data', (data) => {
  console.error('Server error:', data.toString());
});

// Timeout after 10 seconds
setTimeout(() => {
  if (!serverStarted) {
    console.error('❌ Server failed to start within 10 seconds');
    console.log('Server output:', serverOutput);
    serverProcess.kill();
    process.exit(1);
  }
}, 10000);

serverProcess.on('exit', (code) => {
  if (serverStarted) {
    console.log('✅ Production server test completed successfully');
    console.log('🚀 Ready for deployment!');
  } else {
    console.error('❌ Server exited with code:', code);
    process.exit(1);
  }
});