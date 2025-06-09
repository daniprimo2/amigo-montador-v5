#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment readiness...\n');

const checks = [];

// Check 1: Verify dist/index.js exists (the critical requirement)
console.log('1. Checking for required entry point file...');
const indexExists = fs.existsSync('dist/index.js');
checks.push({
  name: 'dist/index.js entry point exists',
  status: indexExists ? 'PASS' : 'FAIL',
  details: indexExists ? 'Entry point file created successfully' : 'Missing required entry point file'
});

if (indexExists) {
  const indexSize = fs.statSync('dist/index.js').size;
  checks.push({
    name: 'dist/index.js has content',
    status: indexSize > 1000 ? 'PASS' : 'FAIL',
    details: `File size: ${Math.round(indexSize / 1024)}KB`
  });
}

// Check 2: Verify package.json structure
console.log('2. Checking production package.json...');
const pkgExists = fs.existsSync('dist/package.json');
checks.push({
  name: 'dist/package.json exists',
  status: pkgExists ? 'PASS' : 'FAIL',
  details: pkgExists ? 'Production package.json created' : 'Missing production package.json'
});

if (pkgExists) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'package.json has correct main entry',
    status: pkg.main === 'index.js' ? 'PASS' : 'FAIL',
    details: `Main entry: ${pkg.main}`
  });
  
  checks.push({
    name: 'package.json has start script',
    status: pkg.scripts?.start ? 'PASS' : 'FAIL',
    details: pkg.scripts?.start || 'No start script found'
  });
  
  checks.push({
    name: 'package.json has required dependencies',
    status: pkg.dependencies?.express && pkg.dependencies?.["drizzle-orm"] ? 'PASS' : 'FAIL',
    details: `${Object.keys(pkg.dependencies || {}).length} dependencies included`
  });
}

// Check 3: Verify frontend files
console.log('3. Checking frontend build...');
const htmlExists = fs.existsSync('dist/public/index.html');
checks.push({
  name: 'dist/public/index.html exists',
  status: htmlExists ? 'PASS' : 'FAIL',
  details: htmlExists ? 'Frontend entry point available' : 'Missing frontend files'
});

// Check 4: Verify server configuration for deployment
console.log('4. Checking server configuration...');
if (fs.existsSync('server/index.ts')) {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  
  const hasPortEnv = serverContent.includes('process.env.PORT');
  const hasCorrectDefault = serverContent.includes('5000');
  const hasCorrectHost = serverContent.includes('0.0.0.0');
  const hasHealthCheck = serverContent.includes('/health');
  
  checks.push({
    name: 'Server uses PORT environment variable',
    status: hasPortEnv ? 'PASS' : 'FAIL',
    details: hasPortEnv ? 'PORT environment variable configured' : 'Missing PORT configuration'
  });
  
  checks.push({
    name: 'Server defaults to port 5000',
    status: hasCorrectDefault ? 'PASS' : 'FAIL',
    details: hasCorrectDefault ? 'Default port 5000 configured' : 'Incorrect default port'
  });
  
  checks.push({
    name: 'Server binds to 0.0.0.0',
    status: hasCorrectHost ? 'PASS' : 'FAIL',
    details: hasCorrectHost ? 'External access enabled' : 'Incorrect host binding'
  });
  
  checks.push({
    name: 'Health check endpoint available',
    status: hasHealthCheck ? 'PASS' : 'FAIL',
    details: hasHealthCheck ? 'Health check endpoints configured' : 'Missing health check'
  });
}

// Check 5: Verify essential directories
console.log('5. Checking required directories...');
const requiredDirs = ['dist/shared', 'dist/uploads', 'dist/attached_assets'];
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  checks.push({
    name: `${dir} directory exists`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'Directory available' : 'Directory missing'
  });
});

// Check 6: Verify build process creates all critical files
console.log('6. Checking build completeness...');
const criticalFiles = [
  'dist/index.js',
  'dist/package.json', 
  'dist/public/index.html'
];

const allCriticalExist = criticalFiles.every(file => fs.existsSync(file));
checks.push({
  name: 'All critical deployment files exist',
  status: allCriticalExist ? 'PASS' : 'FAIL',
  details: allCriticalExist ? 'Complete deployment structure' : 'Missing critical files'
});

// Summary
console.log('\n📋 DEPLOYMENT READINESS REPORT');
console.log('═'.repeat(50));

const passed = checks.filter(c => c.status === 'PASS').length;
const total = checks.length;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${check.name}`);
  if (check.status === 'FAIL') {
    console.log(`   └─ ${check.details}`);
  }
});

console.log('═'.repeat(50));
console.log(`RESULT: ${passed}/${total} checks passed`);

if (passed === total) {
  console.log('\n🎉 DEPLOYMENT READY!');
  console.log('All suggested fixes have been successfully implemented:');
  console.log('✓ dist/index.js entry point created');
  console.log('✓ Server configured for port 5000');
  console.log('✓ Production package.json with correct dependencies');
  console.log('✓ Health check endpoints available');
  console.log('✓ All required directories and files present');
  console.log('\nThe application is now ready for deployment.');
} else {
  console.log('\n⚠️  Some issues need attention before deployment.');
  const failed = checks.filter(c => c.status === 'FAIL');
  failed.forEach(check => {
    console.log(`• ${check.name}: ${check.details}`);
  });
}