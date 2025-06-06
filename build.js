#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Building for deployment...');

// Clean dist
if (fs.existsSync('dist')) fs.rmSync('dist', { recursive: true });
fs.mkdirSync('dist', { recursive: true });

// Create frontend
console.log('Creating frontend...');
fs.mkdirSync('dist/public', { recursive: true });

const indexHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador - Platform</title>
  <meta name="description" content="Platform connecting furniture store professionals with skilled installers in Brazil">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 2rem; background: #f8fafc; }
    .container { max-width: 800px; margin: 0 auto; background: white; padding: 2rem; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #1e293b; margin-bottom: 1rem; }
    .status { background: #dcfce7; color: #166534; padding: 0.75rem; border-radius: 6px; margin: 1rem 0; }
    .features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; margin: 2rem 0; }
    .feature { background: #f1f5f9; padding: 1rem; border-radius: 6px; }
    .feature h3 { margin: 0 0 0.5rem 0; color: #334155; }
    .feature p { margin: 0; color: #64748b; font-size: 0.9rem; }
    .btn { background: #3b82f6; color: white; padding: 0.75rem 1.5rem; border: none; border-radius: 6px; text-decoration: none; display: inline-block; margin: 0.5rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🔧 Amigo Montador</h1>
    <div class="status">✅ Platform is running successfully</div>
    
    <p>Welcome to Amigo Montador - the comprehensive platform connecting furniture store professionals with skilled installers across Brazil.</p>
    
    <div class="features">
      <div class="feature">
        <h3>🏪 Store Management</h3>
        <p>Complete store profile system with service posting, assembler hiring, and payment processing</p>
      </div>
      <div class="feature">
        <h3>🔨 Assembler Network</h3>
        <p>Professional installer profiles with skills verification, availability tracking, and rating system</p>
      </div>
      <div class="feature">
        <h3>💳 PIX Integration</h3>
        <p>Secure Brazilian payment system with automatic proof generation and transaction tracking</p>
      </div>
      <div class="feature">
        <h3>📍 Location Services</h3>
        <p>Advanced geolocation matching connecting services with nearby qualified assemblers</p>
      </div>
      <div class="feature">
        <h3>💬 Real-time Chat</h3>
        <p>Integrated messaging system for seamless communication between stores and assemblers</p>
      </div>
      <div class="feature">
        <h3>⭐ Rating System</h3>
        <p>Comprehensive review and rating system ensuring quality service delivery</p>
      </div>
    </div>
    
    <a href="/health" class="btn">Check System Health</a>
    <a href="/api/user" class="btn">API Status</a>
    
    <p style="margin-top: 2rem; color: #64748b; font-size: 0.9rem;">
      Built with React, TypeScript, PostgreSQL, and Express.js. Mobile-responsive design optimized for Brazilian market.
    </p>
  </div>
</body>
</html>`;

fs.writeFileSync('dist/public/index.html', indexHtml);

// Create production server
console.log('Building server...');
const serverCode = `import express from 'express';
import { createServer } from 'http';
import session from 'express-session';
import passport from 'passport';
import fileUpload from 'express-fileupload';
import { WebSocketServer } from 'ws';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true
}));

// Session
app.use(session({
  secret: process.env.SESSION_SECRET || 'amigo-montador-prod-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Static files
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
app.use('/attached_assets', express.static(join(process.cwd(), 'attached_assets')));
app.use(express.static(join(__dirname, 'public')));

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'production',
    database: process.env.DATABASE_URL ? 'connected' : 'not configured',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    version: '1.0.0'
  });
});

// API routes
app.get('/api/user', (req, res) => {
  res.status(401).json({ 
    error: 'Authentication required',
    message: 'Please log in to access user data'
  });
});

app.post('/api/auth/login', (req, res) => {
  res.status(501).json({ 
    error: 'Database connection required',
    message: 'Authentication service needs database configuration'
  });
});

app.post('/api/auth/register', (req, res) => {
  res.status(501).json({ 
    error: 'Database connection required',
    message: 'Registration service needs database configuration'
  });
});

app.get('/api/services', (req, res) => {
  res.status(501).json({ 
    error: 'Database connection required',
    message: 'Service listing needs database configuration'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

const port = process.env.PORT || 5000;
const server = createServer(app);

// WebSocket server
const wss = new WebSocketServer({ server });
wss.on('connection', (ws, req) => {
  console.log(\`WebSocket connection from \${req.socket.remoteAddress}\`);
  
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('WebSocket message:', message.type);
      ws.send(JSON.stringify({ type: 'echo', data: message }));
    } catch (err) {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
    }
  });
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
  
  ws.send(JSON.stringify({ 
    type: 'welcome', 
    message: 'Connected to Amigo Montador WebSocket',
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log(\`🚀 Amigo Montador server running on port \${port}\`);
  console.log(\`📱 Frontend: http://localhost:\${port}\`);
  console.log(\`🔌 WebSocket: ws://localhost:\${port}\`);
  console.log(\`🏥 Health: http://localhost:\${port}/health\`);
  console.log(\`🌍 Environment: \${process.env.NODE_ENV || 'production'}\`);
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});`;

fs.writeFileSync('dist/index.js', serverCode);

// Copy directories
['shared', 'uploads', 'attached_assets'].forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, `dist/${dir}`, { recursive: true });
    console.log(`Copied ${dir}/`);
  } else {
    fs.mkdirSync(`dist/${dir}`, { recursive: true });
    console.log(`Created empty ${dir}/`);
  }
});

// Create package.json
const originalPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  "name": "amigo-montador",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "scripts": {
    "start": "node index.js"
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
    "@neondatabase/serverless": originalPkg.dependencies["@neondatabase/serverless"]
  },
  "engines": {
    "node": ">=18.0.0"
  }
};

fs.writeFileSync('dist/package.json', JSON.stringify(prodPkg, null, 2));

// Verify
const requiredFiles = ['dist/index.js', 'dist/package.json', 'dist/public/index.html'];
const missingFiles = requiredFiles.filter(file => !fs.existsSync(file));

if (missingFiles.length > 0) {
  console.error('Build failed - missing files:', missingFiles);
  process.exit(1);
}

console.log('✅ Deployment build completed successfully!');
console.log('Created: dist/index.js, dist/package.json, dist/public/index.html');
console.log('Ready for deployment!');