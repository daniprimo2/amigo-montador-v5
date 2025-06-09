#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Verifying deployment readiness...\n');

const checks = [];

// Check 1: Critical files exist
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

// Check 2: Package.json configuration
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Main entry point is index.js',
    status: pkg.main === 'index.js' ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Start script exists',
    status: pkg.scripts?.start ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Start script uses node index.js',
    status: pkg.scripts?.start?.includes('node index.js') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'ES modules enabled',
    status: pkg.type === 'module' ? 'PASS' : 'FAIL',
    critical: false
  });
  
  const essentialDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'];
  essentialDeps.forEach(dep => {
    checks.push({
      name: `Dependency ${dep} included`,
      status: pkg.dependencies?.[dep] ? 'PASS' : 'FAIL',
      critical: true
    });
  });
}

// Check 3: Server configuration verification
if (fs.existsSync('dist/index.js')) {
  const serverCode = fs.readFileSync('dist/index.js', 'utf8');
  
  checks.push({
    name: 'Server binds to 0.0.0.0',
    status: serverCode.includes('0.0.0.0') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Uses PORT environment variable',
    status: serverCode.includes('process.env.PORT') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Database connection configured',
    status: serverCode.includes('DATABASE_URL') ? 'PASS' : 'FAIL',
    critical: true
  });
}

// Check 4: Asset directories
const assetDirs = ['uploads', 'attached_assets'];
assetDirs.forEach(dir => {
  const srcExists = fs.existsSync(dir);
  const distExists = fs.existsSync(`dist/${dir}`);
  
  if (srcExists) {
    checks.push({
      name: `${dir} directory copied to dist`,
      status: distExists ? 'PASS' : 'FAIL',
      critical: false
    });
  }
});

// Display results
console.log('Deployment Verification Results:');
console.log('================================\n');

let criticalFailures = 0;
let totalFailures = 0;

checks.forEach(check => {
  const symbol = check.status === 'PASS' ? '✓' : '✗';
  const indicator = check.critical ? '[CRITICAL]' : '[OPTIONAL]';
  
  console.log(`${symbol} ${check.name} ${indicator}`);
  
  if (check.status === 'FAIL') {
    totalFailures++;
    if (check.critical) {
      criticalFailures++;
    }
  }
});

console.log('\n================================');
console.log(`Total checks: ${checks.length}`);
console.log(`Passed: ${checks.length - totalFailures}`);
console.log(`Failed: ${totalFailures}`);
console.log(`Critical failures: ${criticalFailures}`);

if (criticalFailures === 0) {
  console.log('\n🎉 DEPLOYMENT READY!');
  console.log('All critical deployment requirements have been met.');
  console.log('\nDeployment fixes applied:');
  console.log('- Application starts from dist/index.js');
  console.log('- Production package.json with correct start script');
  console.log('- Server binds to 0.0.0.0 and uses PORT environment variable');
  console.log('- Database connection properly configured');
  console.log('- Frontend assets available in dist/public/');
  console.log('- Static assets and uploads copied');
  
  process.exit(0);
} else {
  console.log('\n❌ DEPLOYMENT NOT READY');
  console.log(`${criticalFailures} critical issue(s) must be resolved before deployment.`);
  process.exit(1);
}