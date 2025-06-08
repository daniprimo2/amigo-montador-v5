#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Creating production deployment build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // Build the server with esbuild for optimal production bundle
  console.log('📦 Building server bundle...');
  execSync(`npx esbuild server/index.ts \
    --platform=node \
    --packages=external \
    --bundle \
    --format=esm \
    --outfile=dist/index.js \
    --target=node18 \
    --minify \
    --sourcemap`, 
    { stdio: 'inherit' }
  );

  // Build frontend with Vite
  console.log('🎨 Building frontend...');
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });

  // Copy essential directories
  console.log('📁 Copying assets and data...');
  const dirsToCopy = ['shared', 'uploads', 'attached_assets'];
  
  dirsToCopy.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.cpSync(dir, `dist/${dir}`, { recursive: true });
      console.log(`   ✅ Copied ${dir}/`);
    } else {
      fs.mkdirSync(`dist/${dir}`, { recursive: true });
      console.log(`   📁 Created empty ${dir}/`);
    }
  });

  // Create production package.json
  console.log('📄 Creating production package.json...');
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

  // Create .replit for deployment
  console.log('⚙️ Creating deployment configuration...');
  const replitConfig = `[deployment]
run = ["node", "index.js"]
deploymentTarget = "autoscale"

[[ports]]
localPort = 5000
externalPort = 80
`;
  
  fs.writeFileSync('dist/.replit', replitConfig);

  // Verify build output
  console.log('\n🔍 Verifying build...');
  const requiredFiles = [
    'dist/index.js',
    'dist/package.json', 
    'dist/public/index.html',
    'dist/.replit'
  ];

  let buildValid = true;
  requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      console.log(`   ✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
    } else {
      console.log(`   ❌ ${file} - MISSING`);
      buildValid = false;
    }
  });

  if (!buildValid) {
    throw new Error('Build verification failed - required files missing');
  }

  // Final verification
  const indexSize = fs.statSync('dist/index.js').size;
  const htmlExists = fs.existsSync('dist/public/index.html');

  if (indexSize === 0) {
    throw new Error('Server bundle is empty');
  }

  if (!htmlExists) {
    throw new Error('Frontend build failed');
  }

  console.log('\n✅ Production build completed successfully!');
  console.log('📋 Build summary:');
  console.log(`   - Server bundle: ${(indexSize / 1024).toFixed(1)} KB`);
  console.log('   - Frontend: Built with Vite');
  console.log('   - Assets: Copied to dist/');
  console.log('   - Configuration: Ready for deployment');
  console.log('\n🚀 Ready to deploy with: npm start');

} catch (error) {
  console.error('\n❌ Build failed:', error.message);
  console.error('Build process terminated with errors');
  process.exit(1);
}