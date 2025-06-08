#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Starting production build with deployment fixes...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Step 1: Build frontend with Vite
console.log('1. Building frontend...');
try {
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend built successfully');
} catch (error) {
  console.error('❌ Frontend build failed:', error.message);
  process.exit(1);
}

// Step 2: Build server with proper TypeScript compilation
console.log('2. Building server...');
try {
  // Use esbuild with proper configuration for ESM and Node.js compatibility
  const esbuildCommand = [
    'npx esbuild server/index.ts',
    '--platform=node',
    '--packages=external',
    '--bundle',
    '--format=esm', 
    '--outfile=dist/index.js',
    '--target=node18',
    '--define:import.meta.dirname="__dirname"',
    '--banner:js="import { fileURLToPath } from \'url\'; import path from \'path\'; const __filename = fileURLToPath(import.meta.url); const __dirname = path.dirname(__filename);"'
  ].join(' ');
  
  execSync(esbuildCommand, { stdio: 'inherit' });
  console.log('✅ Server built successfully');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Step 3: Verify dist/index.js was created
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ Critical error: dist/index.js was not created');
  process.exit(1);
}

// Step 4: Create essential directories
const dirs = ['dist/uploads', 'dist/attached_assets', 'dist/shared'];
dirs.forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
  console.log(`✅ Created directory: ${dir}`);
});

// Step 5: Copy shared schemas and static assets
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  console.log('✅ Copied shared schemas');
}

['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
    console.log(`✅ Copied ${dir}`);
  }
});

// Step 6: Create production package.json
console.log('3. Creating production package.json...');
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": originalPkg.dependencies.express,
    "express-session": originalPkg.dependencies["express-session"],
    "express-fileupload": originalPkg.dependencies["express-fileupload"],
    "passport": originalPkg.dependencies.passport,
    "passport-local": originalPkg.dependencies["passport-local"],
    "ws": originalPkg.dependencies.ws,
    "connect-pg-simple": originalPkg.dependencies["connect-pg-simple"],
    "drizzle-orm": originalPkg.dependencies["drizzle-orm"],
    "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"],
    "axios": originalPkg.dependencies.axios,
    "stripe": originalPkg.dependencies.stripe,
    "zod": originalPkg.dependencies.zod,
    "drizzle-zod": originalPkg.dependencies["drizzle-zod"],
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"],
    "node-fetch": originalPkg.dependencies["node-fetch"],
    "date-fns": originalPkg.dependencies["date-fns"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));
console.log('✅ Production package.json created');

// Step 7: Create .replit deployment configuration
const replitConfig = `[deployment]
run = ["node", "index.js"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 5000
externalPort = 80
`;

fs.writeFileSync('dist/.replit', replitConfig);
console.log('✅ Deployment configuration created');

// Step 8: Verify server configuration
console.log('4. Verifying server configuration...');
const serverContent = fs.readFileSync('dist/index.js', 'utf8');

const checks = [
  { name: 'Uses PORT environment variable', test: serverContent.includes('process.env.PORT') },
  { name: 'Defaults to port 5000', test: serverContent.includes('5000') },
  { name: 'Binds to 0.0.0.0', test: serverContent.includes('0.0.0.0') },
  { name: 'Has health check endpoint', test: serverContent.includes('/health') }
];

let allChecksPass = true;
checks.forEach(check => {
  if (check.test) {
    console.log(`✅ ${check.name}`);
  } else {
    console.log(`❌ ${check.name}`);
    allChecksPass = false;
  }
});

if (!allChecksPass) {
  console.error('❌ Server configuration verification failed');
  process.exit(1);
}

// Step 9: Final verification
console.log('5. Final verification...');
const requiredFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html',
  'dist/.replit'
];

let allFilesExist = true;
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} - MISSING`);
    allFilesExist = false;
  }
});

if (!allFilesExist) {
  console.error('❌ Build verification failed: Required files are missing');
  process.exit(1);
}

// Check file sizes
const indexSize = fs.statSync('dist/index.js').size;
console.log(`\n📊 Build statistics:`);
console.log(`- dist/index.js: ${(indexSize / 1024).toFixed(1)} KB`);

console.log('\n🎉 Production build completed successfully!');
console.log('\nDeployment fixes applied:');
console.log('✓ dist/index.js created with proper TypeScript compilation');
console.log('✓ Server configured to listen on PORT environment variable (defaults to 5000)');
console.log('✓ Server binds to 0.0.0.0 for external access');
console.log('✓ Production package.json with correct start command');
console.log('✓ Health check endpoints configured');
console.log('✓ All static assets and directories copied');
console.log('\n🚀 Ready for Replit deployment!');