import esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';

const buildServer = async () => {
  try {
    console.log('Building server...');
    
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
        'pg',
        '@babel/preset-typescript/package.json',
        'lightningcss',
        '../pkg'
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

    // Copy shared directory
    const sharedSrc = 'shared';
    const sharedDest = 'dist/shared';
    
    if (fs.existsSync(sharedSrc)) {
      fs.cpSync(sharedSrc, sharedDest, { recursive: true });
    }

    // Create production package.json
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
    
    console.log('✅ Server build completed successfully');
    
  } catch (error) {
    console.error('❌ Server build failed:', error);
    process.exit(1);
  }
};

buildServer();