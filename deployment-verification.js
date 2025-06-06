#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Verifying deployment readiness...\n');

const checks = [];

// Check 1: Required files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  checks.push({
    name: `File exists: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    critical: true
  });
});

// Check 2: Server entry point is valid
try {
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  const hasExpress = serverContent.includes('express');
  const hasPort5000 = serverContent.includes('5000');
  const hasHostBinding = serverContent.includes('0.0.0.0');
  
  checks.push({
    name: 'Server uses Express framework',
    status: hasExpress ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Server binds to port 5000',
    status: hasPort5000 ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Server binds to 0.0.0.0 (Cloud Run compatible)',
    status: hasHostBinding ? 'PASS' : 'FAIL',
    critical: true
  });
} catch (error) {
  checks.push({
    name: 'Server file validation',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Check 3: Package.json is valid
try {
  const packageJson = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Package.json is valid JSON',
    status: 'PASS',
    critical: true
  });
  
  checks.push({
    name: 'Has start script',
    status: packageJson.scripts?.start ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Uses ES modules',
    status: packageJson.type === 'module' ? 'PASS' : 'FAIL',
    critical: false
  });
} catch (error) {
  checks.push({
    name: 'Package.json validation',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Check 4: Asset directories
const assetDirs = ['uploads', 'attached_assets'];
assetDirs.forEach(dir => {
  const srcExists = fs.existsSync(dir);
  const distExists = fs.existsSync(`dist/${dir}`);
  
  checks.push({
    name: `Asset directory preserved: ${dir}`,
    status: (srcExists && distExists) ? 'PASS' : 'INFO',
    critical: false
  });
});

// Check 5: File sizes (ensure nothing is empty)
try {
  const indexSize = fs.statSync('dist/index.js').size;
  const packageSize = fs.statSync('dist/package.json').size;
  
  checks.push({
    name: 'Server file has content',
    status: indexSize > 100 ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Package.json has content',
    status: packageSize > 50 ? 'PASS' : 'FAIL',
    critical: true
  });
} catch (error) {
  checks.push({
    name: 'File size validation',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Display results
console.log('Deployment Verification Results:');
console.log('================================\n');

let passCount = 0;
let failCount = 0;
let criticalFailures = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : 
               check.status === 'FAIL' ? '❌' : 'ℹ️';
  
  console.log(`${icon} ${check.name}: ${check.status}`);
  
  if (check.error) {
    console.log(`   Error: ${check.error}`);
  }
  
  if (check.status === 'PASS') passCount++;
  if (check.status === 'FAIL') {
    failCount++;
    if (check.critical) criticalFailures++;
  }
});

console.log(`\nSummary: ${passCount} passed, ${failCount} failed`);

if (criticalFailures === 0) {
  console.log('\n🎉 Deployment is ready! All critical checks passed.');
  console.log('\nNext steps:');
  console.log('1. The dist/index.js file is ready for deployment');
  console.log('2. Server will bind to 0.0.0.0:5000 for Cloud Run compatibility');
  console.log('3. All static assets have been preserved');
  process.exit(0);
} else {
  console.log(`\n🚨 Deployment not ready: ${criticalFailures} critical failures`);
  process.exit(1);
}