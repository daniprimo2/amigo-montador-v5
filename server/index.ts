import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic, log } from "./vite.js";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';

// For ESM compatibility in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Health check endpoints
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    port: process.env.PORT || 5000
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve default avatar and other static files from root directory
app.get('/default-avatar.svg', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'default-avatar.svg'));
});

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    // Production static file serving
    const publicPath = path.resolve(process.cwd(), "dist", "public");
    const rootPath = process.cwd();
    
    if (fs.existsSync(publicPath)) {
      // Vite build structure (dist/public/)
      app.use(express.static(publicPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
    } else if (fs.existsSync(path.join(rootPath, "index.html"))) {
      // Deployment build structure (index.html in root)
      app.use(express.static(rootPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(rootPath, "index.html"));
      });
    } else {
      // Fallback to original serveStatic
      serveStatic(app);
    }
  }

  // Use PORT environment variable for deployment compatibility
  // Replit deployments use port 5000 for external access
  const port = parseInt(process.env.PORT || '5000');
  const host = "0.0.0.0";
  
  server.listen(port, host, () => {
    log(`serving on port ${port}`);
    console.log(`🚀 Amigo Montador running on port ${port}`);
    console.log(`📱 Application: http://0.0.0.0:${port}`);
    if (process.env.NODE_ENV === 'production') {
      console.log(`✅ Production deployment successful`);
    }
  });
})();
