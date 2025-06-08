#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔧 Applying deployment fixes...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

console.log('1. Building server bundle...');
try {
  // Build server with esbuild - avoiding import conflicts
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/index.js \
    --target=node18`, 
    { stdio: 'inherit' }
  );
  
  console.log('✅ Server bundle created');
} catch (error) {
  console.error('❌ Server build failed:', error.message);
  process.exit(1);
}

// Verify dist/index.js exists
if (!fs.existsSync('dist/index.js')) {
  console.error('❌ CRITICAL: dist/index.js was not created');
  process.exit(1);
}

console.log('2. Creating production package.json...');
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
    "zod-validation-error": originalPkg.dependencies["zod-validation-error"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

console.log('3. Creating required directories...');
['dist/uploads', 'dist/attached_assets', 'dist/shared', 'dist/public'].forEach(dir => {
  fs.mkdirSync(dir, { recursive: true });
});

console.log('4. Copying assets...');
if (fs.existsSync('shared')) {
  fs.cpSync('shared', 'dist/shared', { recursive: true });
}

['uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('dist', dir), { recursive: true });
  }
});

console.log('5. Creating simple index.html...');
const html = `<!DOCTYPE html>
<html>
<head>
  <title>Amigo Montador</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
  <div id="root">
    <h1>Amigo Montador</h1>
    <p>Conectando lojas e montadores</p>
    <p>Aplicação inicializando...</p>
  </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', html);

console.log('6. Creating deployment configuration...');
const replitConfig = `[deployment]
run = ["node", "index.js"]
deploymentTarget = "cloudrun"

[[ports]]
localPort = 5000
externalPort = 80
`;

fs.writeFileSync('dist/.replit', replitConfig);

console.log('7. Validating deployment configuration...');
const serverContent = fs.readFileSync('dist/index.js', 'utf8');

const validations = [
  { check: 'PORT environment variable', test: serverContent.includes('process.env.PORT') },
  { check: 'Port 5000 default', test: serverContent.includes('5000') },
  { check: '0.0.0.0 host binding', test: serverContent.includes('0.0.0.0') },
  { check: 'Health endpoint', test: serverContent.includes('/health') }
];

let allValid = true;
validations.forEach(v => {
  if (v.test) {
    console.log(`✅ ${v.check}`);
  } else {
    console.log(`❌ ${v.check}`);
    allValid = false;
  }
});

if (!allValid) {
  console.error('❌ Server configuration validation failed');
  process.exit(1);
}

const fileSize = fs.statSync('dist/index.js').size;
console.log(`\n📊 dist/index.js: ${Math.round(fileSize / 1024)}KB`);

console.log('\n🎉 Deployment fixes applied successfully!');
console.log('✓ dist/index.js created and validated');
console.log('✓ Server configured for port 5000 with 0.0.0.0 binding');
console.log('✓ Production package.json with correct start command');
console.log('✓ All required assets copied');
console.log('\n🚀 Ready for deployment!');