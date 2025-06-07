#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Verifying deployment port configuration...\n');

const checks = [];

// Check 1: Server configuration
console.log('1. Checking server configuration...');
if (fs.existsSync('server/index.ts')) {
  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  
  const hasPortEnv = serverContent.includes('process.env.PORT');
  const hasCorrectDefault = serverContent.includes("process.env.PORT || '5000'");
  const hasCorrectHost = serverContent.includes('0.0.0.0');
  
  checks.push({
    name: 'Server uses PORT environment variable',
    status: hasPortEnv ? 'PASS' : 'FAIL',
    details: hasPortEnv ? 'Correctly configured' : 'Missing PORT environment variable usage'
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
}

// Check 2: Package.json scripts
console.log('2. Checking package.json configuration...');
if (fs.existsSync('package.json')) {
  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  
  const hasStartScript = packageJson.scripts && packageJson.scripts.start;
  const hasCorrectStart = hasStartScript && packageJson.scripts.start.includes('dist/index.js');
  
  checks.push({
    name: 'Start script exists',
    status: hasStartScript ? 'PASS' : 'FAIL',
    details: hasStartScript ? 'Start script configured' : 'Missing start script'
  });
  
  checks.push({
    name: 'Start script points to dist/index.js',
    status: hasCorrectStart ? 'PASS' : 'FAIL',
    details: hasCorrectStart ? 'Correct production entry point' : 'Incorrect start script target'
  });
}

// Check 3: Replit configuration
console.log('3. Checking .replit configuration...');
if (fs.existsSync('.replit')) {
  const replitConfig = fs.readFileSync('.replit', 'utf8');
  
  const hasPort5000 = replitConfig.includes('localPort = 5000');
  const hasExternalMapping = replitConfig.includes('externalPort = 80');
  const hasWaitForPort = replitConfig.includes('waitForPort = 5000');
  
  checks.push({
    name: 'Port 5000 configured in .replit',
    status: hasPort5000 ? 'PASS' : 'FAIL',
    details: hasPort5000 ? 'Local port 5000 mapped' : 'Port 5000 not configured'
  });
  
  checks.push({
    name: 'External port mapping configured',
    status: hasExternalMapping ? 'PASS' : 'FAIL',
    details: hasExternalMapping ? 'External port mapping exists' : 'No external port mapping'
  });
  
  checks.push({
    name: 'Workflow waits for port 5000',
    status: hasWaitForPort ? 'PASS' : 'FAIL',
    details: hasWaitForPort ? 'Workflow configured for port 5000' : 'Workflow not waiting for correct port'
  });
}

// Check 4: Build output verification
console.log('4. Running production build test...');
try {
  console.log('   Building application...');
  execSync('npm run build', { stdio: 'pipe' });
  
  const distIndexExists = fs.existsSync('dist/index.js');
  const distPackageExists = fs.existsSync('dist/package.json');
  
  checks.push({
    name: 'Production build creates dist/index.js',
    status: distIndexExists ? 'PASS' : 'FAIL',
    details: distIndexExists ? 'Server bundle created' : 'Server bundle missing'
  });
  
  checks.push({
    name: 'Production build creates dist/package.json',
    status: distPackageExists ? 'PASS' : 'FAIL',
    details: distPackageExists ? 'Production package.json created' : 'Production package.json missing'
  });
  
  // Check production server port configuration
  if (distIndexExists) {
    const distServerContent = fs.readFileSync('dist/index.js', 'utf8');
    const hasProductionPort = distServerContent.includes('process.env.PORT') || distServerContent.includes('5000');
    
    checks.push({
      name: 'Production server has port configuration',
      status: hasProductionPort ? 'PASS' : 'FAIL',
      details: hasProductionPort ? 'Production server configured for port 5000' : 'Production server missing port configuration'
    });
  }
  
} catch (error) {
  checks.push({
    name: 'Production build test',
    status: 'FAIL',
    details: `Build failed: ${error.message}`
  });
}

// Display results
console.log('\n📊 DEPLOYMENT PORT VERIFICATION RESULTS\n');
console.log('═'.repeat(60));

let passCount = 0;
let failCount = 0;

checks.forEach((check, index) => {
  const status = check.status === 'PASS' ? '✅' : '❌';
  console.log(`${status} ${check.name}`);
  console.log(`   ${check.details}`);
  console.log('');
  
  if (check.status === 'PASS') {
    passCount++;
  } else {
    failCount++;
  }
});

console.log('═'.repeat(60));
console.log(`Summary: ${passCount} passed, ${failCount} failed`);

if (failCount === 0) {
  console.log('\n🎉 All port configuration checks passed!');
  console.log('✅ The application is ready for deployment on port 5000');
  console.log('🌐 External access will be available through Replit\'s port mapping');
} else {
  console.log('\n⚠️  Some configuration issues found.');
  console.log('📝 Review the failed checks above and fix the configuration.');
}

console.log('\n🚀 Deployment Instructions:');
console.log('1. Use the "Deploy" button in Replit');
console.log('2. The application will run on port 5000 internally');
console.log('3. Replit will map port 5000 to external port 80');
console.log('4. Access your app via the provided deployment URL');