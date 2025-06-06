import express from 'express';
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

console.log('Servidor de produção iniciando...');

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use(session({
  secret: process.env.SESSION_SECRET || 'amigo-montador-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    maxAge: 24 * 60 * 60 * 1000
  }
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(fileUpload({
  limits: { fileSize: 10 * 1024 * 1024 },
  createParentPath: true
}));

app.use('/uploads', express.static('uploads'));
app.use('/attached_assets', express.static('attached_assets'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: 'production'
  });
});

app.get('/api/user', (req, res) => {
  res.status(401).json({ error: 'Não autenticado' });
});

app.get('*', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Amigo Montador</title>
        <style>
          body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #667eea; color: white; }
          .container { max-width: 600px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 40px; border-radius: 20px; }
          .status { color: #4CAF50; font-weight: bold; margin: 20px 0; }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Amigo Montador</h1>
            <p class="status">Servidor funcionando corretamente!</p>
            <p>Deploy realizado com sucesso na porta ${process.env.PORT || 5000}</p>
            <p>Timestamp: ${new Date().toLocaleString('pt-BR')}</p>
        </div>
    </body>
    </html>
  `);
});

const port = process.env.PORT || 5000;
const server = createServer(app);

const wss = new WebSocketServer({ server });

server.listen({
  port,
  host: "0.0.0.0",
}, () => {
  console.log(`Servidor rodando na porta ${port}`);
});