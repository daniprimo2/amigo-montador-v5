import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando aplicação...');

// Verificar se temos um arquivo JS compilado
const jsFile = path.join(__dirname, 'index.js');
const tsFile = path.join(__dirname, 'server/index.ts');

let command, args;

if (fs.existsSync(jsFile)) {
  console.log('📦 Executando versão compilada (JS)...');
  command = 'node';
  args = [jsFile];
} else if (fs.existsSync(tsFile)) {
  console.log('📝 Executando versão TypeScript com tsx...');
  command = 'npx';
  args = ['tsx', tsFile];
} else {
  console.error('❌ Arquivo de entrada não encontrado!');
  process.exit(1);
}

// Iniciar o processo
const child = spawn(command, args, {
  stdio: 'inherit',
  env: { ...process.env }
});

child.on('error', (error) => {
  console.error('❌ Erro ao iniciar aplicação:', error);
  process.exit(1);
});

child.on('exit', (code) => {
  console.log(`🔄 Aplicação encerrada com código: ${code}`);
  process.exit(code);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('🛑 Recebido SIGINT, encerrando aplicação...');
  child.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('🛑 Recebido SIGTERM, encerrando aplicação...');
  child.kill('SIGTERM');
});