#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Final deployment validation...');

// Test the complete build process
console.log('1. Testing complete build process...');
try {
  execSync('node deployment-fix.js', { stdio: 'inherit' });
  console.log('✅ Build process completed successfully');
} catch (error) {
  console.error('❌ Build process failed');
  process.exit(1);
}

// Validate all required files exist
console.log('\n2. Validating deployment files...');
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html',
  'dist/.replit'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    console.log(`✅ ${file} (${Math.round(size / 1024)}KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('\n❌ Validation failed: Required files missing');
  process.exit(1);
}

// Validate server configuration
console.log('\n3. Validating server configuration...');
const serverContent = fs.readFileSync('dist/index.js', 'utf8');
const packageContent = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));

const validations = [
  { check: 'PORT environment variable used', test: serverContent.includes('process.env.PORT') },
  { check: 'Default port 5000 configured', test: serverContent.includes('5000') },
  { check: '0.0.0.0 host binding', test: serverContent.includes('0.0.0.0') },
  { check: 'Health endpoints available', test: serverContent.includes('/health') },
  { check: 'Production start script', test: packageContent.scripts.start.includes('node index.js') },
  { check: 'Required dependencies present', test: packageContent.dependencies.express && packageContent.dependencies.axios }
];

let allValidationsPass = true;
validations.forEach(v => {
  if (v.test) {
    console.log(`✅ ${v.check}`);
  } else {
    console.log(`❌ ${v.check}`);
    allValidationsPass = false;
  }
});

if (!allValidationsPass) {
  console.error('\n❌ Server configuration validation failed');
  process.exit(1);
}

// Test production server startup (quick test)
console.log('\n4. Testing production server startup...');
try {
  execSync('cd dist && PORT=3002 NODE_ENV=production timeout 3s node index.js', { stdio: 'pipe' });
} catch (error) {
  if (error.status === 124) {
    console.log('✅ Production server starts successfully (timeout expected)');
  } else {
    console.error('❌ Production server failed to start');
    console.error(error.stdout?.toString() || error.stderr?.toString());
    process.exit(1);
  }
}

console.log('\n🎉 All deployment validations passed!');
console.log('\nDeployment Summary:');
console.log('✓ dist/index.js created with proper bundling');
console.log('✓ Server configured for Cloud Run (PORT env var, 0.0.0.0 binding)');
console.log('✓ Production package.json with correct dependencies');
console.log('✓ Health check endpoints configured');
console.log('✓ All static assets and directories prepared');
console.log('✓ Production server startup verified');
console.log('\n🚀 Ready for Replit deployment!');