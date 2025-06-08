#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment readiness...\n');

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
    name: `Required file: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'File exists' : 'File missing'
  });
});

// Check 2: Package.json configuration
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Package.json main entry',
    status: pkg.main === 'index.js' ? 'PASS' : 'FAIL',
    details: `Main: ${pkg.main}`
  });
  
  checks.push({
    name: 'Package.json start script',
    status: pkg.scripts?.start === 'node index.js' ? 'PASS' : 'FAIL',
    details: `Start: ${pkg.scripts?.start}`
  });
  
  checks.push({
    name: 'Package.json type module',
    status: pkg.type === 'module' ? 'PASS' : 'FAIL',
    details: `Type: ${pkg.type}`
  });
  
  checks.push({
    name: 'Node.js version requirement',
    status: pkg.engines?.node ? 'PASS' : 'FAIL',
    details: `Node: ${pkg.engines?.node || 'Not specified'}`
  });
}

// Check 3: Server bundle size
if (fs.existsSync('dist/index.js')) {
  const stats = fs.statSync('dist/index.js');
  const sizeKB = Math.round(stats.size / 1024);
  
  checks.push({
    name: 'Server bundle size',
    status: sizeKB > 0 && sizeKB < 1000 ? 'PASS' : 'WARN',
    details: `${sizeKB}KB`
  });
}

// Check 4: Essential directories
const essentialDirs = ['dist/shared'];
essentialDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  checks.push({
    name: `Essential directory: ${dir}`,
    status: exists ? 'PASS' : 'FAIL',
    details: exists ? 'Directory exists' : 'Directory missing'
  });
});

// Check 5: Production dependencies
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  const criticalDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'];
  
  criticalDeps.forEach(dep => {
    const exists = pkg.dependencies && pkg.dependencies[dep];
    checks.push({
      name: `Critical dependency: ${dep}`,
      status: exists ? 'PASS' : 'FAIL',
      details: exists ? `Version: ${pkg.dependencies[dep]}` : 'Missing'
    });
  });
}

// Display results
console.log('Deployment Verification Results:');
console.log('================================\n');

let passCount = 0;
let failCount = 0;
let warnCount = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : 
               check.status === 'WARN' ? '⚠️' : '❌';
  
  console.log(`${icon} ${check.name}`);
  console.log(`   ${check.details}\n`);
  
  if (check.status === 'PASS') passCount++;
  else if (check.status === 'WARN') warnCount++;
  else failCount++;
});

console.log('Summary:');
console.log(`✅ Passed: ${passCount}`);
if (warnCount > 0) console.log(`⚠️  Warnings: ${warnCount}`);
if (failCount > 0) console.log(`❌ Failed: ${failCount}`);

console.log('\n🚀 Deployment Status:');
if (failCount === 0) {
  console.log('✅ READY FOR DEPLOYMENT');
  console.log('All critical requirements met!');
  console.log('\nNext steps:');
  console.log('1. Commit your changes');
  console.log('2. Use the Replit Deploy button');
  console.log('3. The system will use "npm run build" to create the deployment');
  console.log('4. The server will start with "npm start" → "node dist/index.js"');
} else {
  console.log('❌ NOT READY FOR DEPLOYMENT');
  console.log(`${failCount} critical issue(s) need to be resolved.`);
  process.exit(1);
}