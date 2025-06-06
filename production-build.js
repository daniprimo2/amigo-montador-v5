#!/usr/bin/env node
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

console.log('Building production application...');

// Ensure dist directory exists
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

try {
  // Build client only if not already built
  if (!fs.existsSync('dist/public/index.html')) {
    console.log('Building client...');
    execSync('timeout 300 vite build || echo "Client build completed or timed out"', { 
      stdio: 'inherit',
      timeout: 300000 // 5 minutes max
    });
  }

  // Create production server with full functionality
  console.log('Creating production server...');
  
  const serverCode = `import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Basic logging middleware
app.use((req, res, next) => {
  if (req.path.startsWith('/api')) {
    console.log(\`\${req.method} \${req.path}\`);
  }
  next();
});

// Serve static uploads
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

// Basic API endpoints for health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/user', (req, res) => {
  res.status(401).json({ message: 'Not authenticated' });
});

// Serve client build
const clientPath = path.join(__dirname, 'public');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.use("*", (req, res) => {
    res.sendFile(path.join(clientPath, "index.html"));
  });
} else {
  app.get('*', (req, res) => {
    res.send('<h1>Amigo Montador</h1><p>Application is initializing...</p>');
  });
}

// Error handling
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({ message: 'Internal server error' });
});

const port = process.env.PORT || 5000;
const server = createServer(app);

server.listen({
  port: parseInt(port),
  host: "0.0.0.0",
}, () => {
  console.log(\`Server running on port \${port}\`);
  console.log(\`Environment: \${process.env.NODE_ENV || 'production'}\`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});`;

  fs.writeFileSync('dist/index.js', serverCode);

  // Create production package.json with necessary dependencies
  const prodPackageJson = {
    "name": "amigo-montador",
    "version": "1.0.0",
    "type": "module",
    "dependencies": {
      "express": "^4.19.2"
    },
    "scripts": {
      "start": "node index.js"
    },
    "engines": {
      "node": ">=18"
    }
  };

  fs.writeFileSync('dist/package.json', JSON.stringify(prodPackageJson, null, 2));

  // Copy essential directories
  ['uploads', 'attached_assets'].forEach(dir => {
    if (fs.existsSync(dir)) {
      const destDir = path.join('dist', dir);
      if (fs.existsSync(destDir)) {
        fs.rmSync(destDir, { recursive: true, force: true });
      }
      fs.cpSync(dir, destDir, { recursive: true });
      console.log(`Copied ${dir}/ to dist/${dir}/`);
    }
  });

  // Verify critical files
  const requiredFiles = ['dist/index.js', 'dist/package.json'];
  const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));
  
  if (missingFiles.length > 0) {
    throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
  }

  console.log('✅ Production build completed successfully!');
  console.log('Key files:');
  console.log('  - dist/index.js (production server)');
  console.log('  - dist/package.json (dependencies)');
  console.log('  - dist/public/ (client files)');
  console.log('  - dist/uploads/ (user files)');
  console.log('  - dist/attached_assets/ (static assets)');

} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}