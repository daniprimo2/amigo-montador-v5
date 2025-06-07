#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('🔍 Verifying build integrity...');

// Check if dist directory exists
if (!fs.existsSync('dist')) {
  console.error('❌ dist directory not found');
  process.exit(1);
}

// Define critical files and their minimum sizes (in bytes)
const criticalFiles = {
  'dist/index.js': 1000,         // Server bundle should be at least 1KB
  'dist/package.json': 100,      // Package.json should exist
  'dist/public/index.html': 200  // Frontend should have basic HTML
};

let allFilesValid = true;

// Check each critical file
Object.entries(criticalFiles).forEach(([filePath, minSize]) => {
  if (!fs.existsSync(filePath)) {
    console.error(`❌ Missing file: ${filePath}`);
    allFilesValid = false;
    return;
  }

  const stats = fs.statSync(filePath);
  if (stats.size < minSize) {
    console.error(`❌ File too small: ${filePath} (${stats.size} bytes, minimum ${minSize})`);
    allFilesValid = false;
    return;
  }

  console.log(`✅ ${filePath} (${(stats.size / 1024).toFixed(2)} KB)`);
});

// Verify package.json structure
try {
  const packageJson = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  if (!packageJson.main) {
    console.error('❌ package.json missing main field');
    allFilesValid = false;
  }
  
  if (!packageJson.scripts || !packageJson.scripts.start) {
    console.error('❌ package.json missing start script');
    allFilesValid = false;
  }
  
  if (!packageJson.dependencies || !packageJson.dependencies.express) {
    console.error('❌ package.json missing express dependency');
    allFilesValid = false;
  }
  
  console.log('✅ package.json structure valid');
} catch (error) {
  console.error('❌ Invalid package.json:', error.message);
  allFilesValid = false;
}

// Verify server file contains required elements
try {
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  
  const requiredElements = [
    'express',
    'createServer',
    'listen'
  ];
  
  const missingElements = requiredElements.filter(element => !serverContent.includes(element));
  
  if (missingElements.length > 0) {
    console.error('❌ Server file missing required elements:', missingElements);
    allFilesValid = false;
  } else {
    console.log('✅ Server file contains required elements');
  }
} catch (error) {
  console.error('❌ Cannot read server file:', error.message);
  allFilesValid = false;
}

// Check directory structure
const requiredDirs = ['dist/uploads', 'dist/attached_assets'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    console.error(`❌ Missing directory: ${dir}`);
    allFilesValid = false;
  } else {
    console.log(`✅ ${dir} exists`);
  }
});

// Final verification
if (allFilesValid) {
  console.log('\n🎉 Build verification passed!');
  console.log('✅ All critical files present and valid');
  console.log('✅ Package.json properly configured');
  console.log('✅ Server file contains required elements');
  console.log('✅ Directory structure complete');
  process.exit(0);
} else {
  console.log('\n❌ Build verification failed!');
  console.log('Please run the build command again to fix missing files.');
  process.exit(1);
}