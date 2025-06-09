#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';

console.log('Iniciando build e start para deployment...');

// Função para logs com timestamp
function log(message) {
  console.log(`[${new Date().toISOString()}] ${message}`);
}

try {
  // 1. Verificar se estamos em ambiente de produção
  const isProduction = process.env.NODE_ENV === 'production';
  log(`Ambiente: ${isProduction ? 'PRODUÇÃO' : 'DESENVOLVIMENTO'}`);

  // 2. Executar build se necessário
  if (!fs.existsSync('dist/index.js') || isProduction) {
    log('Executando build de produção...');
    execSync('node deployment-final.js', { stdio: 'inherit' });
    log('Build concluído com sucesso');
  } else {
    log('Build já existe, pulando...');
  }

  // 3. Verificar se o arquivo principal existe
  if (!fs.existsSync('dist/index.js')) {
    throw new Error('ERRO: dist/index.js não foi criado pelo build');
  }

  const fileSize = Math.round(fs.statSync('dist/index.js').size / 1024);
  log(`Arquivo principal encontrado: ${fileSize}KB`);

  // 4. Configurar variáveis de ambiente para produção
  const port = process.env.PORT || '5000';
  const host = '0.0.0.0';
  
  log(`Configuração do servidor:`);
  log(`- Porta: ${port}`);
  log(`- Host: ${host}`);
  log(`- Node ENV: ${process.env.NODE_ENV || 'development'}`);

  // 5. Iniciar o servidor
  log('Iniciando servidor de produção...');
  
  // Definir variáveis de ambiente
  process.env.NODE_ENV = 'production';
  process.env.PORT = port;
  
  // Importar e executar o servidor
  const serverPath = path.resolve('dist/index.js');
  log(`Carregando servidor de: ${serverPath}`);
  
  // Usar import dinâmico para ES modules
  await import(serverPath);

} catch (error) {
  console.error('ERRO NO DEPLOYMENT:', error.message);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}