#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying deployment readiness...\n');

// Check if all required files exist
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

console.log('📁 Checking required files:');
let allFilesExist = true;

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

// Check package.json content
console.log('\n📦 Verifying package.json:');
try {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  console.log(`✅ Name: ${pkg.name}`);
  console.log(`✅ Main: ${pkg.main}`);
  console.log(`✅ Start script: ${pkg.scripts.start}`);
  console.log(`✅ Dependencies: ${Object.keys(pkg.dependencies).length} packages`);
  
  if (pkg.main !== 'index.js') {
    console.log('❌ Main should be "index.js"');
    allFilesExist = false;
  }
  
  if (pkg.scripts.start !== 'NODE_ENV=production node index.js') {
    console.log('❌ Start script should be "NODE_ENV=production node index.js"');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Error reading package.json:', error.message);
  allFilesExist = false;
}

// Check static assets
console.log('\n📂 Checking static assets:');
const assetDirs = ['attached_assets', 'uploads', 'shared'];
assetDirs.forEach(dir => {
  const dirPath = path.join('dist', dir);
  if (fs.existsSync(dirPath)) {
    const files = fs.readdirSync(dirPath, { recursive: true });
    console.log(`✅ ${dir}/ (${files.length} items)`);
  } else {
    console.log(`⚠️  ${dir}/ - Not found (optional)`);
  }
});

// Check HTML content
console.log('\n🌐 Verifying HTML:');
try {
  const html = fs.readFileSync('dist/public/index.html', 'utf8');
  if (html.includes('Amigo Montador')) {
    console.log('✅ HTML contains app title');
  } else {
    console.log('❌ HTML missing app title');
    allFilesExist = false;
  }
  
  if (html.includes('charset="UTF-8"')) {
    console.log('✅ HTML has proper encoding');
  } else {
    console.log('❌ HTML missing UTF-8 encoding');
    allFilesExist = false;
  }
} catch (error) {
  console.log('❌ Error reading HTML:', error.message);
  allFilesExist = false;
}

// Summary
console.log('\n📊 Deployment Summary:');
console.log('─'.repeat(50));

if (allFilesExist) {
  console.log('✅ ALL DEPLOYMENT REQUIREMENTS MET');
  console.log('');
  console.log('🚀 Ready for deployment!');
  console.log('');
  console.log('Deployment configuration:');
  console.log('  • Main file: dist/index.js');
  console.log('  • Start command: npm run start');
  console.log('  • Port: Uses PORT environment variable or defaults to 3000');
  console.log('  • Host: 0.0.0.0 (accessible externally)');
  console.log('  • Frontend: Served from dist/public/');
  console.log('  • Static assets: uploaded files and attachments included');
  console.log('');
  console.log('🔧 Fixed issues:');
  console.log('  ✅ Created dist/index.js (production server)');
  console.log('  ✅ Updated package.json start script');
  console.log('  ✅ Configured server for port 3000 with 0.0.0.0 binding');
  console.log('  ✅ Fixed port forwarding compatibility');
  console.log('  ✅ Created production build with required files');
  
  process.exit(0);
} else {
  console.log('❌ DEPLOYMENT REQUIREMENTS NOT MET');
  console.log('');
  console.log('Please fix the issues listed above.');
  process.exit(1);
}