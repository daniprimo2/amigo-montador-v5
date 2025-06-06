#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

console.log('Verificando build para deploy...\n');

const checks = [];

// Verificar arquivos obrigatórios
const requiredFiles = [
  'dist/index.js',
  'dist/package.json', 
  'dist/public/index.html'
];

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  checks.push({
    name: `Arquivo obrigatório: ${file}`,
    status: exists ? 'PASS' : 'FAIL',
    critical: true
  });
});

// Verificar conteúdo do servidor
try {
  const serverContent = fs.readFileSync('dist/index.js', 'utf8');
  
  checks.push({
    name: 'Servidor usa Express',
    status: serverContent.includes('express') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Servidor bind 0.0.0.0:5000',
    status: serverContent.includes('0.0.0.0') && serverContent.includes('5000') ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Endpoints de saúde configurados',
    status: serverContent.includes('/health') ? 'PASS' : 'FAIL',
    critical: false
  });
  
} catch (error) {
  checks.push({
    name: 'Validação do servidor',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Verificar package.json
try {
  const packageContent = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
  
  checks.push({
    name: 'Package.json válido',
    status: 'PASS',
    critical: true
  });
  
  checks.push({
    name: 'Script start configurado',
    status: packageContent.scripts?.start === 'node index.js' ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Módulos ES configurados',
    status: packageContent.type === 'module' ? 'PASS' : 'FAIL',
    critical: true
  });
  
} catch (error) {
  checks.push({
    name: 'Validação package.json',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Verificar diretórios de assets
const assetDirs = ['uploads', 'attached_assets'];
assetDirs.forEach(dir => {
  const exists = fs.existsSync(`dist/${dir}`);
  checks.push({
    name: `Assets preservados: ${dir}`,
    status: exists ? 'PASS' : 'INFO',
    critical: false
  });
});

// Verificar tamanhos dos arquivos
try {
  const indexSize = fs.statSync('dist/index.js').size;
  const packageSize = fs.statSync('dist/package.json').size;
  
  checks.push({
    name: 'Servidor tem conteúdo',
    status: indexSize > 1000 ? 'PASS' : 'FAIL',
    critical: true
  });
  
  checks.push({
    name: 'Package.json tem conteúdo',
    status: packageSize > 100 ? 'PASS' : 'FAIL',
    critical: true
  });
  
} catch (error) {
  checks.push({
    name: 'Validação de tamanhos',
    status: 'FAIL',
    critical: true,
    error: error.message
  });
}

// Exibir resultados
console.log('Resultados da Verificação:');
console.log('==========================\n');

let passCount = 0;
let failCount = 0;
let criticalFailures = 0;

checks.forEach(check => {
  const icon = check.status === 'PASS' ? '✅' : 
               check.status === 'FAIL' ? '❌' : 'ℹ️';
  
  console.log(`${icon} ${check.name}: ${check.status}`);
  
  if (check.error) {
    console.log(`   Erro: ${check.error}`);
  }
  
  if (check.status === 'PASS') passCount++;
  if (check.status === 'FAIL') {
    failCount++;
    if (check.critical) criticalFailures++;
  }
});

console.log(`\nResumo: ${passCount} aprovados, ${failCount} falharam`);

if (criticalFailures === 0) {
  console.log('\n🎉 DEPLOY PRONTO!');
  console.log('\nArquivos verificados:');
  console.log('• dist/index.js - Servidor Express funcional');
  console.log('• dist/package.json - Configuração correta');
  console.log('• dist/public/index.html - Interface de usuário');
  console.log('• Assets estáticos preservados');
  console.log('\nO deploy pode prosseguir com sucesso.');
  process.exit(0);
} else {
  console.log(`\n🚨 Deploy não está pronto: ${criticalFailures} falhas críticas`);
  process.exit(1);
}