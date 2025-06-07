#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment build...');

const checks = [];

// Check 1: Required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/index.html'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  checks.push({
    name: `File exists: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'File found' : 'File missing'
  });
  
  if (exists && file.endsWith('.js')) {
    const stats = fs.statSync(file);
    const sizeMB = (stats.size / 1024 / 1024).toFixed(2);
    checks.push({
      name: `File size: ${file}`,
      status: stats.size > 0 ? 'PASS' : 'FAIL',
      details: `${sizeMB} MB`
    });
  }
});

// Check 2: Required directories exist
console.log('2. Checking required directories...');
const requiredDirs = [
  'dist/uploads',
  'dist/attached_assets',
  'dist/shared'
];

requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  checks.push({
    name: `Directory exists: ${dir}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'Directory found' : 'Directory missing'
  });
});

// Check 3: Package.json configuration
console.log('3. Checking package.json configuration...');
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Package.json has start script',
    status: pkg.scripts && pkg.scripts.start ? 'PASS' : 'FAIL',
    details: pkg.scripts?.start || 'Missing start script'
  });
  
  checks.push({
    name: 'Package.json has correct main file',
    status: pkg.main === 'index.js' ? 'PASS' : 'FAIL',
    details: pkg.main || 'Missing main field'
  });
  
  checks.push({
    name: 'Package.json has required dependencies',
    status: pkg.dependencies && Object.keys(pkg.dependencies).length > 0 ? 'PASS' : 'FAIL',
    details: `${Object.keys(pkg.dependencies || {}).length} dependencies`
  });
}

// Check 4: Server configuration validation
console.log('4. Checking server configuration...');
if (fs.existsSync('server/index.ts')) {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  
  checks.push({
    name: 'Server uses PORT environment variable',
    status: serverContent.includes('process.env.PORT') ? 'PASS' : 'FAIL',
    details: serverContent.includes('process.env.PORT') ? 'PORT env var configured' : 'Missing PORT configuration'
  });
  
  checks.push({
    name: 'Server binds to 0.0.0.0',
    status: serverContent.includes('0.0.0.0') ? 'PASS' : 'FAIL',
    details: serverContent.includes('0.0.0.0') ? 'External access enabled' : 'Incorrect host binding'
  });
  
  checks.push({
    name: 'Server has health check endpoint',
    status: serverContent.includes('/health') ? 'PASS' : 'FAIL',
    details: serverContent.includes('/health') ? 'Health endpoint found' : 'Missing health endpoint'
  });
}

// Check 5: Frontend build validation
console.log('5. Checking frontend configuration...');
if (fs.existsSync('dist/index.html')) {
  const htmlContent = fs.readFileSync('dist/index.html', 'utf8');
  
  checks.push({
    name: 'HTML has proper DOCTYPE',
    status: htmlContent.includes('<!DOCTYPE html>') ? 'PASS' : 'FAIL',
    details: htmlContent.includes('<!DOCTYPE html>') ? 'Valid HTML structure' : 'Missing DOCTYPE'
  });
  
  checks.push({
    name: 'HTML has viewport meta tag',
    status: htmlContent.includes('viewport') ? 'PASS' : 'FAIL',
    details: htmlContent.includes('viewport') ? 'Mobile responsive' : 'Missing viewport'
  });
}

// Display results
console.log('\n📊 Verification Results:');
console.log('========================');

let passCount = 0;
let failCount = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${check.name}: ${check.details}`);
  
  if (check.status === 'PASS') {
    passCount++;
  } else {
    failCount++;
  }
});

console.log('\n📈 Summary:');
console.log(`✅ Passed: ${passCount}`);
console.log(`❌ Failed: ${failCount}`);

if (failCount === 0) {
  console.log('\n🎉 All checks passed! Deployment is ready.');
  process.exit(0);
} else {
  console.log('\n⚠️  Some checks failed. Please review the issues above.');
  process.exit(1);
}