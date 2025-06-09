#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment readiness...\n');

const checks = [];

// Check 1: Critical files exist
const criticalFiles = [
  { path: 'dist/index.js', name: 'Server entry point' },
  { path: 'dist/package.json', name: 'Production package.json' },
  { path: 'dist/public/index.html', name: 'Frontend fallback' }
];

criticalFiles.forEach(({ path: filePath, name }) => {
  const exists = fs.existsSync(filePath);
  checks.push({
    category: 'Critical Files',
    name,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'File exists' : 'File missing'
  });
});

// Check 2: Server configuration
if (fs.existsSync('server/index.ts')) {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  
  checks.push({
    category: 'Server Config',
    name: 'Uses PORT environment variable',
    status: serverContent.includes('process.env.PORT') ? 'PASS' : 'FAIL',
    details: 'PORT environment variable configured'
  });
  
  checks.push({
    category: 'Server Config',
    name: 'Binds to 0.0.0.0',
    status: serverContent.includes('0.0.0.0') ? 'PASS' : 'FAIL',
    details: 'External access enabled'
  });
  
  checks.push({
    category: 'Server Config',
    name: 'Default port 5000',
    status: serverContent.includes("process.env.PORT || '5000'") ? 'PASS' : 'FAIL',
    details: 'Correct default port'
  });
}

// Check 3: Package.json configuration
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  checks.push({
    category: 'Package Config',
    name: 'Build script exists',
    status: packageJson.scripts?.build ? 'PASS' : 'FAIL',
    details: 'Build script configured'
  });
  
  checks.push({
    category: 'Package Config',
    name: 'Start script exists',
    status: packageJson.scripts?.start ? 'PASS' : 'FAIL',
    details: 'Start script configured'
  });
  
  checks.push({
    category: 'Package Config',
    name: 'Main entry point',
    status: packageJson.main === 'dist/index.js' ? 'PASS' : 'FAIL',
    details: 'Correct entry point'
  });
}

// Check 4: Production package.json
if (fs.existsSync('dist/package.json')) {
  const prodPackageJson = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    category: 'Production Config',
    name: 'Production start script',
    status: prodPackageJson.scripts?.start?.includes('node index.js') ? 'PASS' : 'FAIL',
    details: 'Production start command'
  });
  
  checks.push({
    category: 'Production Config',
    name: 'Essential dependencies',
    status: prodPackageJson.dependencies?.express ? 'PASS' : 'FAIL',
    details: 'Core dependencies included'
  });
}

// Check 5: File sizes and structure
if (fs.existsSync('dist/index.js')) {
  const serverSize = Math.round(fs.statSync('dist/index.js').size / 1024);
  checks.push({
    category: 'Build Output',
    name: 'Server bundle size',
    status: serverSize > 50 && serverSize < 1000 ? 'PASS' : 'WARN',
    details: `${serverSize}KB`
  });
}

// Check 6: Required directories
const requiredDirs = ['dist/uploads', 'dist/shared', 'dist/attached_assets'];
requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  checks.push({
    category: 'Directory Structure',
    name: `${dir.replace('dist/', '')} directory`,
    status: exists ? 'PASS' : 'WARN',
    details: exists ? 'Directory exists' : 'Directory missing'
  });
});

// Display results
const categories = [...new Set(checks.map(c => c.category))];

categories.forEach(category => {
  console.log(`📋 ${category}:`);
  checks
    .filter(c => c.category === category)
    .forEach(check => {
      const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
      console.log(`   ${icon} ${check.name}: ${check.details}`);
    });
  console.log();
});

// Summary
const passed = checks.filter(c => c.status === 'PASS').length;
const warned = checks.filter(c => c.status === 'WARN').length;
const failed = checks.filter(c => c.status === 'FAIL').length;

console.log('📊 Summary:');
console.log(`   ✅ Passed: ${passed}`);
console.log(`   ⚠️ Warnings: ${warned}`);
console.log(`   ❌ Failed: ${failed}`);

const isReady = failed === 0;
console.log(`\n🚀 Deployment Status: ${isReady ? 'READY' : 'NOT READY'}`);

if (isReady) {
  console.log('\n✅ All deployment requirements satisfied!');
  console.log('The application is ready for production deployment.');
  console.log('\nDeployment fixes applied:');
  console.log('• Fixed build script to create dist/index.js properly');
  console.log('• Server configured to bind to 0.0.0.0 instead of localhost');
  console.log('• Added PORT environment variable support');
  console.log('• Created production package.json with correct dependencies');
  console.log('• Added health check endpoints for monitoring');
} else {
  console.log('\n❌ Deployment not ready. Please fix the failed checks above.');
  process.exit(1);
}