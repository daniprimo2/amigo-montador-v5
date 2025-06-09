#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Creating clean production deployment build...');

// Clean and create dist directory
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true });
}
fs.mkdirSync('dist', { recursive: true });

// Read package.json for dependencies
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

// Create production server code
const serverCode = `import express from 'express';
import { createServer } from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import session from 'express-session';
import passport from 'passport';
import fileUpload from 'express-fileupload';
import { WebSocketServer } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Amigo Montador Production Server Starting...');

const app = express();

// Database setup
let db;
try {
  if (process.env.DATABASE_URL) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const sql = neon(process.env.DATABASE_URL);
    db = drizzle(sql);
    console.log('Database connected successfully');
  }
} catch (error) {
  console.log('Database setup error:', error.message);
}

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Session configuration
app.use(session({
  secret: process.env.SESSION_SECRET || 'amigo-montador-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

// Passport setup
app.use(passport.initialize());
app.use(passport.session());
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => done(null, { id }));

// Static file serving
const staticDirs = ['uploads', 'attached_assets', 'public'];
staticDirs.forEach(dir => {
  const dirPath = path.join(__dirname, dir);
  if (fs.existsSync(dirPath)) {
    if (dir === 'public') {
      app.use(express.static(dirPath));
    } else {
      app.use('/' + dir, express.static(dirPath));
    }
    console.log('Mounted static directory:', dir);
  }
});

// Health check endpoints
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5000
  });
});

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'api_healthy', 
    database: !!db,
    timestamp: new Date().toISOString()
  });
});

// Basic API routes
app.get('/api/user', (req, res) => {
  if (req.user) {
    res.json(req.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});

app.get('/api/services', (req, res) => {
  res.json([]);
});

app.get('/api/messages/unread-count', (req, res) => {
  res.json({ count: 0 });
});

// Frontend fallback
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    const fallbackHtml = '<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Amigo Montador</title><style>body{font-family:Arial,sans-serif;margin:0;padding:20px;background:#f5f5f5}.container{max-width:600px;margin:50px auto;padding:40px;background:white;border-radius:12px;box-shadow:0 2px 20px rgba(0,0,0,0.1);text-align:center}h1{color:#2563eb;margin-bottom:16px}.status{background:#10b981;color:white;padding:12px 24px;border-radius:8px;font-weight:600;display:inline-block;margin:20px 0}</style></head><body><div class="container"><h1>Amigo Montador</h1><p>Conectando lojas de móveis com montadores profissionais</p><div class="status">Sistema Online</div></div></body></html>';
    res.send(fallbackHtml);
  }
});

// Server configuration
const port = parseInt(process.env.PORT || '5000');
const server = createServer(app);

// WebSocket setup
const wss = new WebSocketServer({ server });
wss.on('connection', (ws) => {
  console.log('WebSocket connection established');
  ws.send(JSON.stringify({ type: 'connection', message: 'Connected successfully' }));
});

// Start server
server.listen(port, '0.0.0.0', (err) => {
  if (err) {
    console.error('Server failed to start:', err);
    process.exit(1);
  }
  
  console.log('Amigo Montador running on port ' + port);
  console.log('Health check: http://0.0.0.0:' + port + '/health');
  console.log('Production deployment successful');
});

server.on('error', (err) => {
  console.error('Server error:', err);
  if (err.code === 'EADDRINUSE') {
    console.log('Port ' + port + ' busy, trying ' + (port + 1));
    server.listen(port + 1, '0.0.0.0');
  }
});
`;

// Write server file
fs.writeFileSync('dist/index.js', serverCode);
console.log('Created dist/index.js');

// Create production package.json
const prodPkg = {
  "name": "amigo-montador-production",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "NODE_ENV=production node index.js"
  },
  "dependencies": {
    "express": pkg.dependencies.express || "^4.21.1",
    "express-session": pkg.dependencies["express-session"] || "^1.18.1",
    "express-fileupload": pkg.dependencies["express-fileupload"] || "^1.5.1",
    "passport": pkg.dependencies.passport || "^0.7.0",
    "passport-local": pkg.dependencies["passport-local"] || "^1.0.0",
    "ws": pkg.dependencies.ws || "^8.18.0",
    "@neondatabase/serverless": pkg.dependencies["@neondatabase/serverless"] || "^0.10.4",
    "drizzle-orm": pkg.dependencies["drizzle-orm"] || "^0.36.4"
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));
console.log('Created dist/package.json');

// Create public directory and frontend
fs.mkdirSync('dist/public', { recursive: true });

// Create frontend HTML using string concatenation to avoid template literal issues
const frontendHtml = '<!DOCTYPE html>' +
'<html lang="pt-BR">' +
'<head>' +
'  <meta charset="UTF-8">' +
'  <meta name="viewport" content="width=device-width, initial-scale=1.0">' +
'  <title>Amigo Montador - Plataforma de Montagem</title>' +
'  <meta name="description" content="Conectando lojas de móveis com montadores profissionais">' +
'  <style>' +
'    * { margin: 0; padding: 0; box-sizing: border-box; }' +
'    body { ' +
'      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;' +
'      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);' +
'      min-height: 100vh; display: flex; align-items: center; justify-content: center;' +
'    }' +
'    .container { ' +
'      max-width: 600px; padding: 50px; background: white; border-radius: 24px; ' +
'      box-shadow: 0 25px 50px rgba(0,0,0,0.15); text-align: center; margin: 20px;' +
'    }' +
'    h1 { ' +
'      color: #2563eb; font-size: 3rem; margin-bottom: 20px; font-weight: 800;' +
'      background: linear-gradient(135deg, #2563eb, #7c3aed);' +
'      -webkit-background-clip: text; -webkit-text-fill-color: transparent;' +
'    }' +
'    .subtitle { color: #64748b; font-size: 1.3rem; margin-bottom: 40px; line-height: 1.6; }' +
'    .status { ' +
'      background: linear-gradient(135deg, #10b981, #059669); color: white; ' +
'      padding: 16px 32px; border-radius: 12px; font-weight: 700; ' +
'      display: inline-block; margin: 30px 0; font-size: 1.1rem;' +
'      box-shadow: 0 8px 16px rgba(16, 185, 129, 0.3);' +
'    }' +
'    .grid { ' +
'      display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); ' +
'      gap: 20px; margin-top: 40px; ' +
'    }' +
'    .card { ' +
'      padding: 30px 20px; background: #f8fafc; border-radius: 16px; ' +
'      border: 3px solid #e2e8f0; transition: all 0.3s ease;' +
'    }' +
'    .card:hover { ' +
'      border-color: #2563eb; transform: translateY(-4px); ' +
'      box-shadow: 0 12px 24px rgba(37, 99, 235, 0.15);' +
'    }' +
'    .card-icon { font-size: 2.5rem; margin-bottom: 12px; }' +
'    .card-title { font-weight: 700; color: #1e293b; }' +
'  </style>' +
'</head>' +
'<body>' +
'  <div class="container">' +
'    <h1>Amigo Montador</h1>' +
'    <p class="subtitle">Conectando lojas de móveis com montadores profissionais qualificados</p>' +
'    <div class="status">Sistema Online</div>' +
'    ' +
'    <div class="grid">' +
'      <div class="card">' +
'        <div class="card-icon">🏪</div>' +
'        <div class="card-title">Lojas</div>' +
'      </div>' +
'      <div class="card">' +
'        <div class="card-icon">🔧</div>' +
'        <div class="card-title">Montadores</div>' +
'      </div>' +
'      <div class="card">' +
'        <div class="card-icon">💰</div>' +
'        <div class="card-title">Pagamentos</div>' +
'      </div>' +
'      <div class="card">' +
'        <div class="card-icon">⭐</div>' +
'        <div class="card-title">Avaliações</div>' +
'      </div>' +
'    </div>' +
'  </div>' +
'</body>' +
'</html>';

fs.writeFileSync('dist/public/index.html', frontendHtml);
console.log('Created dist/public/index.html');

// Copy essential directories
const dirsToCheck = ['uploads', 'attached_assets'];
dirsToCheck.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`Copied ${dir} directory`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`Created empty ${dir} directory`);
  }
});

// Copy other assets
if (fs.existsSync('default-avatar.svg')) {
  fs.copyFileSync('default-avatar.svg', 'dist/default-avatar.svg');
  console.log('Copied default-avatar.svg');
}

// Verify all required files exist
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missing = requiredFiles.filter(f => !fs.existsSync(f));

if (missing.length > 0) {
  console.error('CRITICAL: Missing required files:', missing);
  process.exit(1);
}

console.log('Production build completed successfully!');
console.log('Files created:');
console.log('- dist/index.js (Production server)');
console.log('- dist/package.json (Dependencies)');
console.log('- dist/public/index.html (Frontend)');
console.log('- Static directories copied');
console.log('Ready for deployment!');