#!/usr/bin/env node
import fs from 'fs';

console.log('🔍 Verificação Final de Deployment\n');

const verificacoes = [
  {
    nome: 'Arquivo principal dist/index.js',
    teste: () => fs.existsSync('dist/index.js'),
    critico: true
  },
  {
    nome: 'Package.json de produção',
    teste: () => fs.existsSync('dist/package.json'),
    critico: true
  },
  {
    nome: 'Script de start configurado',
    teste: () => {
      const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
      return pkg.scripts && pkg.scripts.start && pkg.scripts.start.includes('node index.js');
    },
    critico: true
  },
  {
    nome: 'Configuração de porta (PORT env)',
    teste: () => {
      const content = fs.readFileSync('dist/index.js', 'utf8');
      return content.includes('process.env.PORT');
    },
    critico: true
  },
  {
    nome: 'Host binding (0.0.0.0)',
    teste: () => {
      const content = fs.readFileSync('dist/index.js', 'utf8');
      return content.includes('0.0.0.0');
    },
    critico: true
  },
  {
    nome: 'Endpoints de saúde',
    teste: () => {
      const content = fs.readFileSync('dist/index.js', 'utf8');
      return content.includes('/health');
    },
    critico: false
  },
  {
    nome: 'Dependências essenciais',
    teste: () => {
      const pkg = JSON.parse(fs.readFileSync('dist/package.json', 'utf8'));
      const essenciais = ['express', 'drizzle-orm', '@neondatabase/serverless'];
      return essenciais.every(dep => pkg.dependencies[dep]);
    },
    critico: true
  },
  {
    nome: 'Diretórios de assets',
    teste: () => fs.existsSync('dist/attached_assets') && fs.existsSync('dist/uploads'),
    critico: false
  }
];

let todasCriticasPassaram = true;
let totalPassaram = 0;

verificacoes.forEach(v => {
  const passou = v.teste();
  const status = passou ? '✅' : (v.critico ? '❌' : '⚠️');
  console.log(`${status} ${v.nome}`);
  
  if (passou) totalPassaram++;
  if (v.critico && !passou) todasCriticasPassaram = false;
});

console.log(`\n📊 Resultado: ${totalPassaram}/${verificacoes.length} verificações passaram`);

if (todasCriticasPassaram) {
  console.log('\n🎉 DEPLOYMENT APROVADO!');
  console.log('✓ Todas as verificações críticas passaram');
  console.log('✓ Aplicação pronta para deployment no Replit');
  console.log('✓ Configuração de porta e host compatível com Cloud Run');
  
  const tamanho = Math.round(fs.statSync('dist/index.js').size / 1024);
  console.log(`✓ Arquivo compilado: ${tamanho}KB`);
  
  process.exit(0);
} else {
  console.log('\n❌ DEPLOYMENT REPROVADO!');
  console.log('Verificações críticas falharam - corrija antes de fazer deploy');
  process.exit(1);
}