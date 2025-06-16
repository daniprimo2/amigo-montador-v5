#!/usr/bin/env node

// ========== CONFIGURAÇÃO SIMPLES ==========
// Edite apenas esta linha com a URL do seu Replit:
const APP_URL = 'https://workspace.amigomontador01.replit.app';
// ==========================================

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🚀 Configurando app para Play Store...\n');

// Verificar Java
try {
  execSync('java -version', { stdio: 'pipe' });
  console.log('✅ Java instalado');
} catch {
  console.log('❌ Instale Java primeiro: sudo apt install openjdk-11-jdk');
  process.exit(1);
}

// Atualizar URL no MainActivity.java
const mainActivityPath = 'android-playstore/app/src/main/java/com/amigomontador/app/MainActivity.java';

if (fs.existsSync(mainActivityPath)) {
  let content = fs.readFileSync(mainActivityPath, 'utf8');
  
  // Atualizar URL
  content = content.replace(
    /private static final String APP_URL = ".*";/,
    `private static final String APP_URL = "${APP_URL}";`
  );
  
  fs.writeFileSync(mainActivityPath, content);
  console.log(`✅ URL configurada: ${APP_URL}`);
} else {
  console.log('❌ Arquivo MainActivity.java não encontrado');
  console.log('Certifique-se que a pasta android-playstore existe');
  process.exit(1);
}

// Executar build do AAB
console.log('📦 Gerando arquivo AAB...');
try {
  process.chdir('android-playstore');
  process.env.APP_URL = APP_URL;
  execSync('node build-mobile-compliant.js', { stdio: 'inherit' });
  
  // Verificar se AAB foi criado
  const aabFiles = [
    '../amigomontador-release.aab',
    './amigomontador-release.aab',
    '../GUIA_PLAY_STORE.md'
  ];
  
  let aabFound = false;
  for (const file of aabFiles) {
    if (fs.existsSync(file) && file.includes('.aab')) {
      const stats = fs.statSync(file);
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`\n🎉 SUCESSO! AAB gerado: ${file} (${sizeKB} KB)`);
      aabFound = true;
      break;
    }
  }
  
  if (!aabFound) {
    console.log('\n⚠️ AAB pode ter sido gerado - verifique a pasta android-playstore');
  }
  
  console.log(`\n📋 Próximos passos:`);
  console.log(`1. Acesse: https://play.google.com/console`);
  console.log(`2. Crie novo app`);
  console.log(`3. Faça upload do arquivo .aab gerado`);
  console.log(`4. Configure store listing e publique`);
  
} catch (error) {
  console.log('\n❌ Erro no build:', error.message);
  console.log('\n🔧 Possíveis soluções:');
  console.log('• Instalar Android Studio e configurar ANDROID_HOME');
  console.log('• Verificar se Gradle está instalado');
  console.log('• Executar em ambiente com SDK Android');
}