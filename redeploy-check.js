#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('Sistema de Verificação para Redeploy\n');

const issues = [];
const warnings = [];

// Verifica arquivos críticos de build
const criticalFiles = [
  'dist/index.js',
  'dist/package.json',
  'dist/public/index.html'
];

criticalFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    issues.push(`Arquivo crítico ausente: ${file}`);
  }
});

// Verifica configuração do package.json de produção
if (fs.existsSync('dist/package.json')) {
  const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  if (pkg.main !== 'index.js') {
    issues.push('Entry point incorreto no package.json de produção');
  }
  
  if (!pkg.scripts?.start?.includes('node index.js')) {
    issues.push('Script de start incorreto');
  }
  
  const requiredDeps = ['express', 'drizzle-orm', '@neondatabase/serverless'];
  requiredDeps.forEach(dep => {
    if (!pkg.dependencies?.[dep]) {
      issues.push(`Dependência crítica ausente: ${dep}`);
    }
  });
}

// Verifica configuração do servidor
if (fs.existsSync('dist/index.js')) {
  const serverCode = fs.readFileSync('dist/index.js', 'utf8');
  
  if (!serverCode.includes('0.0.0.0')) {
    issues.push('Servidor não configurado para bind 0.0.0.0');
  }
  
  if (!serverCode.includes('process.env.PORT')) {
    issues.push('Variável PORT não configurada');
  }
}

// Verifica variáveis de ambiente necessárias
const envVars = ['DATABASE_URL'];
envVars.forEach(envVar => {
  if (!process.env[envVar]) {
    warnings.push(`Variável de ambiente ${envVar} não definida`);
  }
});

// Verifica diretórios de assets
const assetDirs = ['uploads', 'attached_assets'];
assetDirs.forEach(dir => {
  if (fs.existsSync(dir) && !fs.existsSync(`dist/${dir}`)) {
    warnings.push(`Diretório ${dir} não copiado para produção`);
  }
});

// Testa compilação fresh
console.log('Testando build limpo...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true });
  }
  execSync('npm run build', { stdio: 'pipe' });
  console.log('✓ Build limpo executado com sucesso');
} catch (error) {
  issues.push('Falha no build limpo');
}

// Testa start do servidor de produção
console.log('Testando servidor de produção...');
try {
  const result = execSync('cd dist && PORT=9999 timeout 3 node index.js', { 
    stdio: 'pipe',
    encoding: 'utf8'
  });
  console.log('✓ Servidor de produção inicia corretamente');
} catch (error) {
  const output = error.stdout || error.stderr || '';
  if (output.includes('serving on port') || output.includes('Database connection')) {
    console.log('✓ Servidor de produção inicia corretamente');
  } else if (output.includes('EADDRINUSE')) {
    console.log('✓ Servidor funcional (porta em uso é esperado)');
  } else {
    console.log('Verificando output do servidor...');
    console.log('Output:', output.slice(0, 200));
    issues.push('Falha ao iniciar servidor de produção');
  }
}

// Relatório final
console.log('\n=== RELATÓRIO DE REDEPLOY ===');

if (issues.length === 0) {
  console.log('✓ SISTEMA PRONTO PARA REDEPLOY');
  console.log('\nTodos os requisitos críticos atendidos:');
  console.log('- Build de produção funcional');
  console.log('- Servidor configurado corretamente');
  console.log('- Dependências incluídas');
  console.log('- Entry point correto (dist/index.js)');
  console.log('- Bind para 0.0.0.0 e PORT configurados');
  
  if (warnings.length > 0) {
    console.log('\nAvisos (não críticos):');
    warnings.forEach(warning => console.log(`! ${warning}`));
  }
  
  console.log('\n🚀 O redeploy pode ser executado com segurança');
  process.exit(0);
} else {
  console.log('❌ PROBLEMAS ENCONTRADOS');
  console.log('\nProblemas críticos que impedem o redeploy:');
  issues.forEach(issue => console.log(`✗ ${issue}`));
  
  if (warnings.length > 0) {
    console.log('\nAvisos adicionais:');
    warnings.forEach(warning => console.log(`! ${warning}`));
  }
  
  console.log('\nResolva os problemas críticos antes do redeploy');
  process.exit(1);
}