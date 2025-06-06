#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Criando build de deploy rápido...');

// Garantir que dist existe
if (!fs.existsSync('dist')) {
  fs.mkdirSync('dist', { recursive: true });
}

// Build apenas do servidor
try {
  console.log('Compilando servidor...');
  execSync('npx esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outfile=dist/server.js', { stdio: 'inherit' });
  
  // Criar package.json minimalista
  const deployPkg = {
    "name": "amigo-montador",
    "version": "1.0.0",
    "type": "module",
    "main": "server.js",
    "scripts": {
      "start": "node server.js"
    },
    "dependencies": {
      "express": "^4.21.2",
      "express-session": "^1.18.1",
      "express-fileupload": "^1.5.1",
      "passport": "^0.7.0",
      "passport-local": "^1.0.0",
      "ws": "^8.18.0",
      "connect-pg-simple": "^10.0.0",
      "drizzle-orm": "^0.39.3",
      "@neondatabase/serverless": "^0.10.4",
      "axios": "^1.9.0",
      "stripe": "^18.1.0",
      "zod": "^3.24.2",
      "drizzle-zod": "^0.7.1",
      "zod-validation-error": "^3.4.0"
    },
    "engines": {
      "node": ">=18.0.0"
    }
  };
  
  fs.writeFileSync('dist/package.json', JSON.stringify(deployPkg, null, 2));
  
  // Copiar arquivos essenciais
  if (fs.existsSync('shared')) {
    fs.cpSync('shared', 'dist/shared', { recursive: true });
  }
  
  // Criar frontend básico se não existir
  if (!fs.existsSync('dist/public')) {
    fs.mkdirSync('dist/public', { recursive: true });
    
    const basicIndex = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Amigo Montador</title>
    <style>
        body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
        .container { max-width: 600px; margin: 0 auto; }
        .loading { color: #667eea; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Amigo Montador</h1>
        <p class="loading">Sistema inicializado com sucesso!</p>
        <p>A aplicação está rodando na porta ${process.env.PORT || 5000}.</p>
    </div>
</body>
</html>`;
    
    fs.writeFileSync('dist/public/index.html', basicIndex);
  }
  
  console.log('✅ Deploy build criado com sucesso!');
  console.log('Arquivos:');
  console.log('- dist/server.js');
  console.log('- dist/package.json');
  console.log('- dist/public/index.html');
  
} catch (error) {
  console.error('Erro no build:', error.message);
  process.exit(1);
}