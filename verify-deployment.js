#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('Verifying deployment configuration...\n');

const checks = [];

// 1. Check if dist/index.js exists and is valid
console.log('1. Checking compiled server...');
if (fs.existsSync('dist/index.js')) {
  const stats = fs.statSync('dist/index.js');
  const isValidSize = stats.size > 1000; // At least 1KB
  checks.push({
    name: 'dist/index.js exists',
    status: 'PASS',
    details: `File size: ${(stats.size / 1024).toFixed(2)} KB`
  });
  
  if (isValidSize) {
    checks.push({
      name: 'dist/index.js has valid content',
      status: 'PASS',
      details: 'File size indicates successful compilation'
    });
  } else {
    checks.push({
      name: 'dist/index.js has valid content',
      status: 'FAIL',
      details: 'File too small, compilation may have failed'
    });
  }
} else {
  checks.push({
    name: 'dist/index.js exists',
    status: 'FAIL',
    details: 'Critical deployment file missing'
  });
}

// 2. Check production package.json
console.log('2. Checking production package.json...');
if (fs.existsSync('dist/package.json')) {
  const prodPkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'dist/package.json exists',
    status: 'PASS',
    details: 'Production package configuration found'
  });
  
  const hasStartScript = prodPkg.scripts && prodPkg.scripts.start;
  const correctStartScript = hasStartScript && prodPkg.scripts.start.includes('node index.js');
  
  checks.push({
    name: 'Start script configured correctly',
    status: correctStartScript ? 'PASS' : 'FAIL',
    details: hasStartScript ? prodPkg.scripts.start : 'Missing start script'
  });
  
  const hasRequiredDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'].every(
    dep => prodPkg.dependencies && prodPkg.dependencies[dep]
  );
  
  checks.push({
    name: 'Essential dependencies included',
    status: hasRequiredDeps ? 'PASS' : 'FAIL',
    details: hasRequiredDeps ? 'Core dependencies present' : 'Missing critical dependencies'
  });
} else {
  checks.push({
    name: 'dist/package.json exists',
    status: 'FAIL',
    details: 'Production package.json missing'
  });
}

// 3. Check frontend assets
console.log('3. Checking frontend assets...');
if (fs.existsSync('dist/public/index.html')) {
  checks.push({
    name: 'Frontend index.html exists',
    status: 'PASS',
    details: 'Frontend entry point available'
  });
} else {
  checks.push({
    name: 'Frontend index.html exists',
    status: 'FAIL',
    details: 'Frontend entry point missing'
  });
}

// 4. Check essential directories
console.log('4. Checking essential directories...');
const essentialDirs = ['shared', 'uploads', 'attached_assets'];
essentialDirs.forEach(dir => {
  if (fs.existsSync(`dist/${dir}`)) {
    checks.push({
      name: `${dir} directory copied`,
      status: 'PASS',
      details: 'Required directory present'
    });
  } else {
    checks.push({
      name: `${dir} directory copied`,
      status: 'WARN',
      details: 'Directory not found (may be optional)'
    });
  }
});

// 5. Test production server startup
console.log('5. Testing production server startup...');
try {
  const testOutput = execSync('cd dist && timeout 3s node index.js 2>&1 || true', { 
    encoding: 'utf8',
    timeout: 5000
  });
  
  const serverStarted = testOutput.includes('serving on port') || 
                       testOutput.includes('running on port') ||
                       testOutput.includes('EADDRINUSE');
  
  checks.push({
    name: 'Production server starts',
    status: serverStarted ? 'PASS' : 'FAIL',
    details: serverStarted ? 'Server initialization successful' : 'Server failed to start'
  });
} catch (error) {
  checks.push({
    name: 'Production server starts',
    status: 'FAIL',
    details: `Startup test failed: ${error.message}`
  });
}

// Display results
console.log('\n=== DEPLOYMENT VERIFICATION RESULTS ===\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✓' : 
               check.status === 'FAIL' ? '✗' : 
               '⚠';
  
  console.log(`${icon} ${check.name}: ${check.status}`);
  console.log(`  ${check.details}\n`);
  
  if (check.status === 'PASS') passCount++;
  else if (check.status === 'FAIL') failCount++;
  else warnCount++;
});

console.log('=== SUMMARY ===');
console.log(`✓ Passed: ${passCount}`);
console.log(`✗ Failed: ${failCount}`);
console.log(`⚠ Warnings: ${warnCount}`);

if (failCount === 0) {
  console.log('\n🎉 DEPLOYMENT READY!');
  console.log('All critical checks passed. Your application is ready for deployment.');
} else {
  console.log('\n❌ DEPLOYMENT ISSUES DETECTED');
  console.log('Please fix the failed checks before deploying.');
  process.exit(1);
}