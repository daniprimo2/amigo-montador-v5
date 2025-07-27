import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🚀 Iniciando aplicação...');

// Verificar se temos um arquivo JS compilado
const jsFile = path.join(__dirname, 'dist/index.js');
const jsFileRoot = path.join(__dirname, 'index.js');
const tsFile = path.join(__dirname, 'server/index.ts');

console.log('🔍 Procurando arquivos de entrada...');
console.log('Verificando:', jsFile);
console.log('Verificando:', jsFileRoot);
console.log('Verificando:', tsFile);

let command, args;

if (fs.existsSync(tsFile)) {
  console.log('📝 Executando versão TypeScript com tsx...');
  command = 'npx';
  args = ['tsx', tsFile];
} else if (fs.existsSync(jsFile)) {
  console.log('📦 Executando versão compilada (JS) em dist/...');
  command = 'node';
  args = [jsFile];
} else if (fs.existsSync(jsFileRoot)) {
  console.log('📦 Executando versão compilada (JS) no root...');
  command = 'node';
  args = [jsFileRoot];
} else {
  console.error('❌ Arquivo de entrada não encontrado!');
  console.error('Arquivos verificados:');
  console.error('- ', jsFile, fs.existsSync(jsFile) ? '✅' : '❌');
  console.error('- ', jsFileRoot, fs.existsSync(jsFileRoot) ? '✅' : '❌');
  console.error('- ', tsFile, fs.existsSync(tsFile) ? '✅' : '❌');
  
  // Tentar listar o conteúdo do diretório para debug
  console.error('Conteúdo do diretório atual:');
  try {
    const files = fs.readdirSync(__dirname);
    files.forEach(file => console.error('- ', file));
  } catch (error) {
    console.error('Erro ao listar diretório:', error.message);
  }
  
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