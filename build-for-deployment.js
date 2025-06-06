import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔨 Starting deployment build process...');

const buildForDeployment = async () => {
  try {
    // Clean dist directory
    if (fs.existsSync('dist')) {
      fs.rmSync('dist', { recursive: true, force: true });
    }
    fs.mkdirSync('dist', { recursive: true });

    console.log('📦 Building client (Vite)...');
    execSync('npx vite build', { stdio: 'inherit' });

    console.log('🔧 Building server (ESBuild)...');
    await esbuild.build({
      entryPoints: ['server/index.ts'],
      bundle: true,
      platform: 'node',
      target: 'node18',
      format: 'esm',
      outdir: 'dist',
      external: [
        'express',
        'drizzle-orm',
        '@neondatabase/serverless',
        'ws',
        'passport',
        'express-session',
        'connect-pg-simple',
        'express-fileupload',
        'axios',
        'react-input-mask',
        'bcrypt',
        'pg'
      ],
      define: {
        'import.meta.dirname': '__dirname'
      },
      banner: {
        js: `
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`
      },
      minify: false,
      sourcemap: false,
      logLevel: 'info'
    });

    // Copy shared directory to dist
    console.log('📁 Copying shared directory...');
    const sharedSrc = 'shared';
    const sharedDest = 'dist/shared';
    
    if (fs.existsSync(sharedSrc)) {
      fs.cpSync(sharedSrc, sharedDest, { recursive: true });
    }

    // Copy attached_assets to dist
    console.log('🖼️ Copying assets...');
    const assetsSrc = 'attached_assets';
    const assetsDest = 'dist/attached_assets';
    
    if (fs.existsSync(assetsSrc)) {
      fs.cpSync(assetsSrc, assetsDest, { recursive: true });
    }

    // Copy uploads directory if it exists
    if (fs.existsSync('uploads')) {
      fs.cpSync('uploads', 'dist/uploads', { recursive: true });
    } else {
      fs.mkdirSync('dist/uploads', { recursive: true });
    }

    // Copy default-avatar.svg if it exists
    if (fs.existsSync('default-avatar.svg')) {
      fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
    }

    // Create production package.json
    console.log('📄 Creating production package.json...');
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const prodPackageJson = {
      name: packageJson.name,
      version: packageJson.version,
      type: 'module',
      dependencies: packageJson.dependencies,
      scripts: {
        start: "node index.js"
      }
    };
    
    fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

    // Verify the build
    console.log('✅ Verifying build output...');
    const indexExists = fs.existsSync('dist/index.js');
    const publicExists = fs.existsSync('dist/public');
    const packageExists = fs.existsSync('dist/package.json');

    console.log(`   - dist/index.js: ${indexExists ? '✅' : '❌'}`);
    console.log(`   - dist/public: ${publicExists ? '✅' : '❌'}`);
    console.log(`   - dist/package.json: ${packageExists ? '✅' : '❌'}`);

    if (!indexExists) {
      throw new Error('dist/index.js was not created');
    }

    console.log('🎉 Deployment build completed successfully!');
    console.log('📋 Build summary:');
    console.log('   - Client built to dist/public/');
    console.log('   - Server built to dist/index.js');
    console.log('   - Dependencies configured for production');
    console.log('   - Ready for deployment with "node dist/index.js"');
    
  } catch (error) {
    console.error('❌ Deployment build failed:', error);
    process.exit(1);
  }
};

buildForDeployment();