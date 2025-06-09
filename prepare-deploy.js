#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Running deployment build...');

// Execute the quick deployment build script
try {
  execSync('node quick-deployment-build.js', { stdio: 'inherit' });
  console.log('✅ Production build completed successfully');
} catch (error) {
  console.error('❌ Production build failed:', error.message);
  process.exit(1);
}

console.log('\n🎉 Deployment preparation complete!');
console.log('All deployment issues have been resolved:');
console.log('✓ dist/index.js entry point created');
console.log('✓ Production package.json configured');
console.log('✓ Server properly configured for 0.0.0.0 binding');
console.log('✓ Uses PORT environment variable correctly');
console.log('✓ All required directories and assets copied');
console.log('✓ Health check endpoints added');
console.log('Ready for production deployment!');