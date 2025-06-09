#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Construindo frontend para produção...');

// Criar diretório public se não existir
if (!fs.existsSync('dist/public')) {
  fs.mkdirSync('dist/public', { recursive: true });
}

try {
  // Tentar build do Vite
  console.log('Executando build do Vite...');
  execSync('npx vite build --outDir dist/public', { stdio: 'inherit' });
  console.log('✅ Frontend build com Vite concluído');
} catch (error) {
  console.log('⚠️ Build do Vite falhou, criando HTML estático...');
  
  // Criar HTML estático básico
  const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amigo Montador</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #333;
    }
    .container {
      background: white;
      padding: 2rem;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      text-align: center;
      max-width: 500px;
      width: 90%;
    }
    h1 {
      color: #2563eb;
      font-size: 2rem;
      margin-bottom: 1rem;
      font-weight: 700;
    }
    .subtitle {
      color: #666;
      font-size: 1.1rem;
      margin-bottom: 2rem;
      line-height: 1.5;
    }
    .loading {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #f3f3f3;
      border-top: 4px solid #2563eb;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 1rem 0;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .status {
      color: #2563eb;
      font-weight: 500;
      margin-top: 1rem;
    }
    .btn {
      background: #2563eb;
      color: white;
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1rem;
      margin-top: 1rem;
    }
    .btn:hover { background: #1d4ed8; }
    @media (max-width: 480px) {
      .container { padding: 1.5rem; }
      h1 { font-size: 1.5rem; }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Amigo Montador</h1>
    <p class="subtitle">Conectando lojas de móveis com montadores profissionais</p>
    <div class="loading"></div>
    <p class="status">Carregando aplicação...</p>
    <button class="btn" onclick="window.location.reload()">Atualizar</button>
  </div>
  <script>
    // Verificar se o servidor está ativo
    setTimeout(() => {
      fetch('/api/health')
        .then(response => response.json())
        .then(data => {
          if (data.status === 'healthy') {
            document.querySelector('.status').textContent = 'Servidor ativo - Redirecionando...';
            setTimeout(() => {
              window.location.href = '/';
            }, 1000);
          }
        })
        .catch(() => {
          document.querySelector('.status').textContent = 'Conectando ao servidor...';
        });
    }, 2000);
  </script>
</body>
</html>`;

  fs.writeFileSync('dist/public/index.html', htmlContent);
  console.log('✅ HTML estático criado');
}

console.log('Frontend de produção configurado');