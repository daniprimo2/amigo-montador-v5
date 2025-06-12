#!/usr/bin/env node

import { existsSync, mkdirSync, cpSync, rmSync, writeFileSync, readFileSync } from 'fs';

console.log('Preparing deployment...');

try {
  // Clean and create dist directory
  if (existsSync('dist')) {
    rmSync('dist', { recursive: true, force: true });
  }
  mkdirSync('dist', { recursive: true });

  // Copy all source files for runtime compilation
  console.log('Copying source files...');
  cpSync('client', 'dist/client', { recursive: true });
  cpSync('server', 'dist/server', { recursive: true });
  cpSync('shared', 'dist/shared', { recursive: true });

  // Copy configuration files
  cpSync('package.json', 'dist/package.json');
  cpSync('tsconfig.json', 'dist/tsconfig.json');
  cpSync('vite.config.ts', 'dist/vite.config.ts');
  cpSync('tailwind.config.ts', 'dist/tailwind.config.ts');
  cpSync('postcss.config.js', 'dist/postcss.config.js');
  cpSync('drizzle.config.ts', 'dist/drizzle.config.ts');

  // Copy public assets
  if (existsSync('public')) {
    cpSync('public', 'dist/public', { recursive: true });
  }

  // Copy attached assets
  if (existsSync('attached_assets')) {
    cpSync('attached_assets', 'dist/attached_assets', { recursive: true });
  }

  // Create upload directories
  mkdirSync('dist/uploads/documents', { recursive: true });
  mkdirSync('dist/uploads/logos', { recursive: true });
  mkdirSync('dist/uploads/profiles', { recursive: true });
  mkdirSync('dist/uploads/projects', { recursive: true });

  // Copy existing uploads
  if (existsSync('uploads')) {
    cpSync('uploads', 'dist/uploads', { recursive: true });
  }

  // Create production entry point
  const indexJs = `#!/usr/bin/env node

// Production entry point for Amigo Montador
import("tsx/esm").then(async (tsx) => {
  // Register tsx for TypeScript compilation
  const { register } = tsx;
  register();
  
  // Import and start the server
  const { default: server } = await import("./server/index.ts");
}).catch(async (error) => {
  console.log("Falling back to direct tsx execution...");
  // Fallback to direct tsx execution
  const { spawn } = await import("child_process");
  const serverProcess = spawn("npx", ["tsx", "server/index.ts"], {
    stdio: "inherit",
    env: { ...process.env, NODE_ENV: "production", PORT: process.env.PORT || "5000" }
  });
  
  serverProcess.on("error", (err) => {
    console.error("Server startup failed:", err);
    process.exit(1);
  });
});
`;

  writeFileSync('dist/index.js', indexJs);

  // Update package.json for production
  const packageJson = JSON.parse(readFileSync('dist/package.json', 'utf8'));
  packageJson.main = 'index.js';
  packageJson.scripts.start = 'NODE_ENV=production PORT=${PORT:-5000} node index.js';
  
  // Ensure tsx is in production dependencies
  if (!packageJson.dependencies.tsx && packageJson.devDependencies?.tsx) {
    packageJson.dependencies.tsx = packageJson.devDependencies.tsx;
  }
  
  writeFileSync('dist/package.json', JSON.stringify(packageJson, null, 2));

  console.log('Deployment preparation completed successfully!');
  console.log('Created runtime TypeScript compilation setup');

} catch (error) {
  console.error('Deployment preparation failed:', error.message);
  process.exit(1);
}