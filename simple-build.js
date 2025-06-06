import fs from 'fs';
import { execSync } from 'child_process';

console.log('Creating deployment build...');

// Clean dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
fs.mkdirSync('dist', { recursive: true });

try {
  // Copy server files without bundling (simpler approach)
  console.log('Copying server files...');
  fs.cpSync('server', 'dist/server', { recursive: true });
  fs.cpSync('shared', 'dist/shared', { recursive: true });
  
  // Copy vite.config.ts for server import
  fs.copyFileSync('vite.config.ts', 'dist/vite.config.ts');
  
  // Copy other necessary config files
  fs.copyFileSync('tailwind.config.ts', 'dist/tailwind.config.ts');
  fs.copyFileSync('postcss.config.js', 'dist/postcss.config.js');
  
  // Create simple index.js that uses tsx to run the TypeScript server
  const startScript = `import { spawn } from 'child_process';
import path from 'path';

const serverPath = path.join(process.cwd(), 'server', 'index.ts');
const child = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: { ...process.env, NODE_ENV: 'production' }
});

child.on('error', (err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  process.exit(code);
});
`;

  fs.writeFileSync('dist/index.js', startScript);

  // Create minimal client build
  console.log('Creating client structure...');
  fs.mkdirSync('dist/public', { recursive: true });
  
  // Create the public directory in the server location where it's expected
  fs.mkdirSync('dist/server/public', { recursive: true });
  
  // Also create the client directory structure that the server expects
  fs.mkdirSync('dist/client', { recursive: true });
  fs.cpSync('client', 'dist/client', { recursive: true });
  
  const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Amigo Montador</title>
  <meta name="description" content="Plataforma que conecta lojas de móveis com montadores profissionais no Brasil" />
</head>
<body>
  <div id="root">
    <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui;">
      <div style="text-align: center;">
        <h1>Amigo Montador</h1>
        <p>Plataforma de montagem de móveis</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  fs.writeFileSync('dist/public/index.html', indexHtml);
  fs.writeFileSync('dist/server/public/index.html', indexHtml);

  // Copy necessary files
  if (fs.existsSync('attached_assets')) {
    fs.cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }
  
  fs.mkdirSync('dist/uploads', { recursive: true });
  
  if (fs.existsSync('default-avatar.svg')) {
    fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
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

  console.log('\nDeployment build completed!');
  console.log('Files created:');
  console.log('  - dist/index.js (start script)');
  console.log('  - dist/server/ (TypeScript server files)');
  console.log('  - dist/public/ (static client)');
  console.log('  - dist/package.json (dependencies)');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}