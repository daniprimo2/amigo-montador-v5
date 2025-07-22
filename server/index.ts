import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.ts";
import { setupVite, serveStatic, log } from "./vite.ts";
import path from "path";
import { fileURLToPath } from 'url';
import fs from 'fs';
import { config } from 'dotenv';
import bodyParser from 'body-parser';
import { rawBodySaver } from './middleware/rawBody.ts';

// Carregar variáveis de ambiente
config();

// For ESM compatibility in production
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json()); 
app.use(express.urlencoded({ extended: false }));

// Serve static files from public directory (for PDFs, assets, etc.)
app.use('/assets', express.static(path.join(process.cwd(), 'public/assets'), {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
  }
}));

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

// Serve PDF files directly
app.get('/assets/termos-privacidade.pdf', (req, res) => {
  const pdfPath = path.join(process.cwd(), 'public/assets/termos-privacidade.pdf');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'inline; filename="termos-privacidade.pdf"');
  res.sendFile(pdfPath);
});

// Log middleware
app.use((req, res, next) => {
  const start = Date.now();
  const pathReq = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (pathReq.startsWith("/api")) {
      let logLine = `${req.method} ${pathReq} ${res.statusCode} in ${duration}ms`;
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


try {
  const server = await registerRoutes(app);

  if (!server?.listen) {
    console.error("❌ registerRoutes não retornou um servidor com .listen()");
    process.exit(1);
  }

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ message });
    console.error('Server error:', err);
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    const publicPath = path.resolve(process.cwd(), "public");
    const distPublicPath = path.resolve(__dirname, "public");
    const rootIndexPath = path.resolve(process.cwd(), "index.html");

    app.use('/attached_assets', express.static(path.join(process.cwd(), 'attached_assets')));

    if (fs.existsSync(distPublicPath)) {
      app.use(express.static(distPublicPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(distPublicPath, "index.html"));
      });
    } else if (fs.existsSync(publicPath)) {
      app.use(express.static(publicPath));
      app.use("*", (_req, res) => {
        res.sendFile(path.resolve(publicPath, "index.html"));
      });
    } else if (fs.existsSync(rootIndexPath)) {
      app.use(express.static(process.cwd()));
      app.use("*", (_req, res) => {
        res.sendFile(rootIndexPath);
      });
    } else {
      serveStatic(app);
    }
  }

  const port = parseInt(process.env.PORT || '5000');
  const host = "127.0.0.1"; // força IPv4 (evita erro ENOTSUP no Windows)

  server.listen(port, host, () => {
      log(`Servidor rodando em http://${host}:${port}`);
  });


} catch (error) {
  console.error('Falha ao iniciar o servidor:', error);
  process.exit(1);
}

