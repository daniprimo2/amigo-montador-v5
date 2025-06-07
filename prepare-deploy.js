#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Running deployment build...');

// Execute the deployment fix script
try {
  execSync('node deployment-fix.js', { stdio: 'inherit' });
  console.log('✅ Deployment build completed successfully');
} catch (error) {
  console.error('❌ Deployment build failed:', error.message);
  process.exit(1);
}

// Run verification
try {
  execSync('node verify-build.js', { stdio: 'inherit' });
  console.log('✅ Build verification passed');
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment preparation complete!');
console.log('All deployment issues have been resolved:');
console.log('✓ dist/index.js entry point created');
console.log('✓ Production package.json configured');
console.log('✓ Server properly configured for port 5000');
console.log('✓ All required directories and assets copied');
console.log('✓ Health check endpoint added');
console.log('Ready for production deployment!');