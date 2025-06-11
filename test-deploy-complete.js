#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'child_process';

console.log('TESTANDO DEPLOY COMPLETO...\n');

const tests = [];

// Teste 1: Verificar estrutura do dist
console.log('1. Verificando estrutura do dist...');
const requiredFiles = [
  'dist/index.js',
  'dist/server-production.js', 
  'dist/package.json',
  'dist/public/index.html',
  'dist/start.sh'
];

requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const stats = fs.statSync(file);
    tests.push({
      name: `${file} existe`,
      status: 'PASS',
      details: `${(stats.size / 1024).toFixed(2)} KB`
    });
  } else {
    tests.push({
      name: `${file} existe`,
      status: 'FAIL',
      details: 'Arquivo ausente'
    });
  }
});

// Teste 2: Verificar package.json de produção
console.log('2. Verificando package.json...');
const prodPkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
tests.push({
  name: 'Start script configurado',
  status: prodPkg.scripts.start ? 'PASS' : 'FAIL',
  details: prodPkg.scripts.start || 'Não encontrado'
});

// Teste 3: Testar servidor principal
console.log('3. Testando servidor principal...');
try {
  const output = execSync('cd dist && PORT=3003 timeout 3s node index.js 2>&1 || true', { 
    encoding: 'utf8',
    timeout: 5000
  });
  
  const success = output.includes('serving on port') || 
                 output.includes('running on port') ||
                 output.includes('Database connection');
  
  tests.push({
    name: 'Servidor principal funciona',
    status: success ? 'PASS' : 'FAIL',
    details: success ? 'Iniciou corretamente' : 'Falha na inicialização'
  });
} catch (error) {
  tests.push({
    name: 'Servidor principal funciona',
    status: 'FAIL',
    details: `Erro: ${error.message}`
  });
}

// Teste 4: Testar servidor alternativo
console.log('4. Testando servidor alternativo...');
try {
  const output = execSync('cd dist && PORT=3004 timeout 3s node server-production.js 2>&1 || true', { 
    encoding: 'utf8',
    timeout: 5000
  });
  
  const success = output.includes('AMIGO MONTADOR FUNCIONANDO') || 
                 output.includes('Deploy realizado');
  
  tests.push({
    name: 'Servidor alternativo funciona',
    status: success ? 'PASS' : 'FAIL',
    details: success ? 'Iniciou corretamente' : 'Falha na inicialização'
  });
} catch (error) {
  tests.push({
    name: 'Servidor alternativo funciona',
    status: 'FAIL',
    details: `Erro: ${error.message}`
  });
}

// Teste 5: Testar npm start
console.log('5. Testando npm start...');
try {
  const output = execSync('cd dist && PORT=3005 timeout 3s npm start 2>&1 || true', { 
    encoding: 'utf8',
    timeout: 8000
  });
  
  const success = output.includes('serving on port') || 
                 output.includes('running on port') ||
                 output.includes('FUNCIONANDO');
  
  tests.push({
    name: 'npm start funciona',
    status: success ? 'PASS' : 'FAIL',
    details: success ? 'Comando npm start OK' : 'Falha no npm start'
  });
} catch (error) {
  tests.push({
    name: 'npm start funciona',
    status: 'FAIL',
    details: `Erro: ${error.message}`
  });
}

// Exibir resultados
console.log('\n=== RESULTADOS DOS TESTES ===\n');

let passCount = 0;
let failCount = 0;

tests.forEach(test => {
  const icon = test.status === 'PASS' ? '✓' : '✗';
  console.log(`${icon} ${test.name}: ${test.status}`);
  console.log(`  ${test.details}\n`);
  
  if (test.status === 'PASS') passCount++;
  else failCount++;
});

console.log('=== RESUMO FINAL ===');
console.log(`✓ Testes aprovados: ${passCount}`);
console.log(`✗ Testes falharam: ${failCount}`);
console.log(`📊 Taxa de sucesso: ${((passCount / tests.length) * 100).toFixed(1)}%`);

if (failCount === 0) {
  console.log('\n🎉 DEPLOY 100% FUNCIONAL!');
  console.log('O sistema está completamente pronto para produção.');
  console.log('\nComandos para deploy:');
  console.log('- npm run build (gera o dist)');
  console.log('- cd dist && npm start (inicia produção)');
} else if (passCount > failCount) {
  console.log('\n⚠️ DEPLOY PARCIALMENTE FUNCIONAL');
  console.log('O deploy funcionará, mas alguns testes falharam.');
} else {
  console.log('\n❌ DEPLOY COM PROBLEMAS');
  console.log('Revise os erros antes do deploy em produção.');
}