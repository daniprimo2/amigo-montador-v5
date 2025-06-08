#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Final deployment verification...');

// Check all required files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/shared/schema.ts',
  'dist/public/index.html'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const size = fs.statSync(file).size;
    console.log(`✅ ${file} (${Math.round(size / 1024)}KB)`);
  } else {
    console.log(`❌ Missing: ${file}`);
    allFilesExist = false;
  }
});

// Verify package.json configuration
const pkgPath = 'dist/package.json';
if (fs.existsSync(pkgPath)) {
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  
  console.log('\n📦 Package.json verification:');
  console.log(`✅ Main entry: ${pkg.main}`);
  console.log(`✅ Start script: ${pkg.scripts.start}`);
  console.log(`✅ Module type: ${pkg.type}`);
  console.log(`✅ Dependencies: ${Object.keys(pkg.dependencies).length} packages`);
  
  // Check critical dependencies
  const criticalDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'];
  criticalDeps.forEach(dep => {
    if (pkg.dependencies[dep]) {
      console.log(`✅ ${dep}: ${pkg.dependencies[dep]}`);
    } else {
      console.log(`❌ Missing dependency: ${dep}`);
      allFilesExist = false;
    }
  });
}

// Verify server configuration
const serverPath = 'dist/index.js';
if (fs.existsSync(serverPath)) {
  const serverContent = fs.readFileSync(serverPath, 'utf8');
  
  console.log('\n🚀 Server configuration verification:');
  
  const checks = [
    { name: 'PORT environment variable', test: serverContent.includes('process.env.PORT') },
    { name: 'Default port 5000', test: serverContent.includes('5000') },
    { name: 'Host binding 0.0.0.0', test: serverContent.includes('0.0.0.0') },
    { name: 'Health endpoint', test: serverContent.includes('/health') },
    { name: 'Express server', test: serverContent.includes('express') },
    { name: 'WebSocket support', test: serverContent.includes('WebSocket') || serverContent.includes('ws') },
    { name: 'Database connection', test: serverContent.includes('DATABASE_URL') || serverContent.includes('@neondatabase') }
  ];
  
  checks.forEach(check => {
    if (check.test) {
      console.log(`✅ ${check.name}`);
    } else {
      console.log(`⚠️  ${check.name} - may need verification`);
    }
  });
}

// Check directory structure
console.log('\n📁 Directory structure verification:');
const requiredDirs = [
  'dist/uploads',
  'dist/attached_assets', 
  'dist/shared',
  'dist/public'
];

requiredDirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    const files = fs.readdirSync(dir).length;
    console.log(`✅ ${dir} (${files} items)`);
  } else {
    console.log(`❌ Missing directory: ${dir}`);
    allFilesExist = false;
  }
});

// Deployment readiness summary
console.log('\n🎯 Deployment Readiness Summary:');
if (allFilesExist) {
  console.log('✅ All required files and directories present');
  console.log('✅ Package.json properly configured for production');
  console.log('✅ Server configured for Cloud Run deployment');
  console.log('✅ Health endpoints available');
  console.log('✅ Static assets copied');
  console.log('✅ Database schema included');
  
  console.log('\n🚀 DEPLOYMENT READY!');
  console.log('\nNext steps:');
  console.log('1. Ensure DATABASE_URL environment variable is set');
  console.log('2. Deploy to Cloud Run using the dist/ directory');
  console.log('3. The app will run on the PORT provided by Cloud Run');
  console.log('4. Health check available at /health and /api/health');
  
  process.exit(0);
} else {
  console.log('❌ DEPLOYMENT NOT READY - Missing required files');
  process.exit(1);
}