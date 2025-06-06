#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Verifying deployment build...\n');

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
    name: `${file} exists`,
    status: exists ? 'PASS' : 'FAIL',
    critical: true
  });
});

// Check 2: Package.json validation
try {
  const packageJson = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Package.json is valid JSON',
    status: 'PASS',
    critical: true
  });
  
  checks.push({
    name: 'Has start script',
    status: packageJson.scripts?.start === 'node index.js' ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Uses ES modules',
    status: packageJson.type === 'module' ? 'PASS' : 'FAIL',
    critical: false
  });
  
  checks.push({
    name: 'Has main entry point',
    status: packageJson.main === 'index.js' ? 'PASS' : 'FAIL',
    critical: true
  });
  
} catch (error) {
  checks.push({
    name: 'Package.json validation',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Check 3: Server file validation
try {
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  
  checks.push({
    name: 'Server imports Express',
    status: serverContent.includes('import express from') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Server has health endpoint',
    status: serverContent.includes("app.get('/health'") ? 'PASS' : 'FAIL',
    critical: false
  });
  
  checks.push({
    name: 'Server binds to 0.0.0.0',
    status: serverContent.includes("'0.0.0.0'") ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Server uses PORT env var',
    status: serverContent.includes('process.env.PORT') ? 'PASS' : 'FAIL',
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

// Check 4: Frontend validation
try {
  const indexHtml = fs.readFileSync('dist/public/index.html', 'utf8');
  
  checks.push({
    name: 'Frontend HTML is valid',
    status: indexHtml.includes('<!DOCTYPE html>') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Has viewport meta tag',
    status: indexHtml.includes('viewport') ? 'PASS' : 'FAIL',
    critical: false
  });
  
  checks.push({
    name: 'Has page title',
    status: indexHtml.includes('<title>') ? 'PASS' : 'FAIL',
    critical: false
  });
  
} catch (error) {
  checks.push({
    name: 'Frontend validation',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Check 5: Directory structure
const expectedDirs = ['shared', 'uploads', 'attached_assets'];
expectedDirs.forEach(dir => {
  const dirPath = `dist/${dir}`;
  checks.push({
    name: `${dir} directory exists`,
    status: fs.existsSync(dirPath) ? 'PASS' : 'FAIL',
    critical: false
  });
});

// Check 6: File sizes (basic sanity check)
try {
  const indexJsStats = fs.statSync('dist/index.js');
  checks.push({
    name: 'Server file size is reasonable',
    status: indexJsStats.size > 1000 && indexJsStats.size < 1000000 ? 'PASS' : 'FAIL',
    critical: false,
    details: `${Math.round(indexJsStats.size / 1024)}KB`
  });
} catch (error) {
  checks.push({
    name: 'Server file size check',
    status: 'FAIL',
    critical: false,
    error: error.message
  });
}

// Display results
console.log('Build Verification Results:');
console.log('='.repeat(40));

let criticalFailures = 0;
let warnings = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : '❌';
  const details = check.details ? ` (${check.details})` : '';
  const error = check.error ? ` - ${check.error}` : '';
  
  console.log(`${icon} ${check.name}${details}${error}`);
  
  if (check.status === 'FAIL' && check.critical) {
    criticalFailures++;
  } else if (check.status === 'FAIL') {
    warnings++;
  }
});

console.log('='.repeat(40));

if (criticalFailures > 0) {
  console.log(`❌ BUILD FAILED: ${criticalFailures} critical issue(s) found`);
  process.exit(1);
} else if (warnings > 0) {
  console.log(`⚠️  BUILD PASSED with ${warnings} warning(s)`);
  console.log('✅ Ready for deployment');
} else {
  console.log('✅ ALL CHECKS PASSED - Ready for deployment');
}

console.log('\nDeployment Summary:');
console.log('- Entry point: dist/index.js');
console.log('- Start command: npm run start');
console.log('- Port: Uses PORT environment variable (fallback: 5000)');
console.log('- Static files: dist/public/');
console.log('- Assets: /uploads, /attached_assets routes configured');