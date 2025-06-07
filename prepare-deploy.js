#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Running production build...');

// Execute the improved build script
try {
  execSync('node build-production.js', { stdio: 'inherit' });
  console.log('✅ Production build completed successfully');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}

// Run verification
try {
  execSync('node verify-build.js', { stdio: 'inherit' });
} catch (error) {
  console.error('❌ Build verification failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment preparation complete!');
console.log('Ready for production deployment with all fixes applied.');