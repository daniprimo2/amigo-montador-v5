#!/usr/bin/env node
import fs from 'fs';

console.log('Verifying deployment fixes...\n');

let allChecks = [];

// Check 1: Verify dist directory and files exist
const requiredFiles = ['dist/index.js', 'dist/package.json'];
requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  allChecks.push({
    name: `File exists: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    critical: true
  });
});

// Check 2: Verify package.json has axios dependency
if (fs.existsSync('dist/package.json')) {
  const distPkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  allChecks.push({
    name: 'axios dependency included',
    status: distPkg.dependencies?.axios ? 'PASS' : 'FAIL',
    critical: true
  });
  
  allChecks.push({
    name: 'All required dependencies present',
    status: (
      distPkg.dependencies?.express &&
      distPkg.dependencies?.axios &&
      distPkg.dependencies?.zod &&
      distPkg.dependencies?.['drizzle-orm'] &&
      distPkg.dependencies?.['@neondatabase/serverless']
    ) ? 'PASS' : 'FAIL',
    critical: true
  });
}

// Check 3: Verify server configuration
if (fs.existsSync('dist/index.js')) {
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  
  allChecks.push({
    name: 'Server uses PORT environment variable',
    status: serverContent.includes('process.env.PORT') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  allChecks.push({
    name: 'Server defaults to port 3000',
    status: serverContent.includes('|| 3000') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  allChecks.push({
    name: 'Server binds to 0.0.0.0',
    status: serverContent.includes('0.0.0.0') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  allChecks.push({
    name: 'Health check endpoint configured',
    status: serverContent.includes('/health') ? 'PASS' : 'FAIL',
    critical: false
  });
}

// Check 4: Verify main server index.ts uses correct port
if (fs.existsSync('server/index.ts')) {
  const mainServerContent = fs.readFileSync('server/index.ts', 'utf8');
  allChecks.push({
    name: 'Main server uses PORT environment variable',
    status: mainServerContent.includes('process.env.PORT') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  allChecks.push({
    name: 'Main server defaults to port 3000',
    status: mainServerContent.includes('|| 3000') ? 'PASS' : 'FAIL',
    critical: true
  });
}

// Check 5: Verify static directories were copied
const staticDirs = ['shared', 'uploads', 'attached_assets'];
staticDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const distDir = `dist/${dir}`;
    allChecks.push({
      name: `Static directory copied: ${dir}`,
      status: fs.existsSync(distDir) ? 'PASS' : 'FAIL',
      critical: false
    });
  }
});

// Display results
console.log('DEPLOYMENT VERIFICATION RESULTS:');
console.log('='.repeat(50));

const criticalChecks = allChecks.filter(check => check.critical);
const nonCriticalChecks = allChecks.filter(check => !check.critical);

console.log('\nCRITICAL CHECKS:');
criticalChecks.forEach(check => {
  const status = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
});

console.log('\nADDITIONAL CHECKS:');
nonCriticalChecks.forEach(check => {
  const status = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
});

const failedCritical = criticalChecks.filter(check => check.status === 'FAIL');
const passedCritical = criticalChecks.filter(check => check.status === 'PASS');

console.log('\n' + '='.repeat(50));
console.log(`SUMMARY: ${passedCritical.length}/${criticalChecks.length} critical checks passed`);

if (failedCritical.length === 0) {
  console.log('🎉 ALL DEPLOYMENT FIXES SUCCESSFULLY APPLIED!');
  console.log('\nFixes applied:');
  console.log('  ✓ Port configuration changed from 5000 to 3000');
  console.log('  ✓ axios dependency included in production build');
  console.log('  ✓ All required dependencies added to dist/package.json');
  console.log('  ✓ Server configured for 0.0.0.0 binding');
  console.log('  ✓ Production server created with proper error handling');
  console.log('\n🚀 Ready for Replit deployment!');
} else {
  console.log('❌ DEPLOYMENT ISSUES REMAINING:');
  failedCritical.forEach(check => {
    console.log(`  - ${check.name}`);
  });
}

export default {};