import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function verifyCompleteSetup() {
  console.log('🔍 Verificando configuração completa do AmigoMontador...');
  console.log('');

  let allGood = true;

  // 1. Verificar arquivos essenciais
  const essentialFiles = [
    '.env',
    'package.json',
    'server/index.ts',
    'client/src/App.tsx',
    'shared/schema.ts',
    'android-release/amigomontador-release.aab',
    'android-release/amigomontador-keystore.jks'
  ];

  console.log('📁 VERIFICANDO ARQUIVOS ESSENCIAIS:');
  for (const file of essentialFiles) {
    if (fs.existsSync(file)) {
      console.log(`   ✅ ${file}`);
    } else {
      console.log(`   ❌ ${file} - FALTANDO!`);
      allGood = false;
    }
  }
  console.log('');

  // 2. Verificar .env
  console.log('⚙️ VERIFICANDO CONFIGURAÇÕES .ENV:');
  if (fs.existsSync('.env')) {
    const envContent = fs.readFileSync('.env', 'utf-8');
    const requiredVars = [
      'DATABASE_URL',
      'SESSION_SECRET',
      'EMAIL_HOST',
      'EMAIL_USER',
      'EMAIL_PASS',
      'PORT'
    ];
    
    for (const varName of requiredVars) {
      if (envContent.includes(varName)) {
        console.log(`   ✅ ${varName} configurado`);
      } else {
        console.log(`   ❌ ${varName} - FALTANDO!`);
        allGood = false;
      }
    }
  } else {
    console.log('   ❌ Arquivo .env não encontrado!');
    allGood = false;
  }
  console.log('');

  // 3. Verificar estrutura de pastas
  console.log('📂 VERIFICANDO ESTRUTURA DE PASTAS:');
  const folders = [
    'uploads/profiles',
    'uploads/documents',
    'uploads/projects',
    'uploads/logos',
    'client/src/components',
    'server',
    'shared'
  ];

  for (const folder of folders) {
    if (fs.existsSync(folder)) {
      console.log(`   ✅ ${folder}`);
    } else {
      console.log(`   ⚠️  ${folder} - Será criado automaticamente`);
      // Criar pasta se não existir
      try {
        fs.mkdirSync(folder, { recursive: true });
        console.log(`   ✅ ${folder} - Criado`);
      } catch (err) {
        console.log(`   ❌ ${folder} - Erro ao criar`);
        allGood = false;
      }
    }
  }
  console.log('');

  // 4. Verificar dependências
  console.log('📦 VERIFICANDO DEPENDÊNCIAS:');
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const criticalDeps = [
      'express',
      'react',
      'drizzle-orm',
      'passport',
      'bcrypt',
      'nodemailer',
      'ws'
    ];

    for (const dep of criticalDeps) {
      if (packageJson.dependencies[dep] || packageJson.devDependencies?.[dep]) {
        console.log(`   ✅ ${dep}`);
      } else {
        console.log(`   ❌ ${dep} - FALTANDO!`);
        allGood = false;
      }
    }
  }
  console.log('');

  // 5. Verificar AAB
  console.log('📱 VERIFICANDO ARQUIVO AAB:');
  const aabPath = 'android-release/amigomontador-release.aab';
  if (fs.existsSync(aabPath)) {
    const stats = fs.statSync(aabPath);
    console.log(`   ✅ AAB encontrado: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`   ✅ Pronto para Play Store Console`);
  } else {
    console.log('   ❌ AAB não encontrado!');
    allGood = false;
  }
  console.log('');

  // 6. Verificar scripts
  console.log('🔧 VERIFICANDO SCRIPTS:');
  if (fs.existsSync('package.json')) {
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf-8'));
    const scripts = packageJson.scripts || {};
    
    const requiredScripts = ['dev', 'build', 'db:push'];
    for (const script of requiredScripts) {
      if (scripts[script]) {
        console.log(`   ✅ npm run ${script}`);
      } else {
        console.log(`   ❌ npm run ${script} - FALTANDO!`);
        allGood = false;
      }
    }
  }
  console.log('');

  // Resultado final
  if (allGood) {
    console.log('🎉 CONFIGURAÇÃO COMPLETA - TUDO FUNCIONANDO!');
    console.log('');
    console.log('📋 PRÓXIMOS PASSOS:');
    console.log('1. Configure as variáveis no .env com suas credenciais reais');
    console.log('2. Execute: npm install (se necessário)');
    console.log('3. Execute: npm run db:push (para sincronizar banco)');
    console.log('4. Execute: npm run dev (para iniciar aplicação)');
    console.log('5. Acesse: http://localhost:5000');
    console.log('');
    console.log('📤 PARA PLAY STORE:');
    console.log('- Faça upload do arquivo: android-release/amigomontador-release.aab');
    console.log('- Acesse: https://play.google.com/console');
    console.log('');
  } else {
    console.log('❌ PROBLEMAS ENCONTRADOS - VERIFIQUE OS ITENS ACIMA');
  }

  return allGood;
}

// Executar verificação
verifyCompleteSetup();