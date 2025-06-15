#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔨 Gerando AAB para Play Store...');

// 1. Verificar se existe keystore
const keystorePath = './amigomontador-keystore.jks';
if (!fs.existsSync(keystorePath)) {
  console.error('❌ Keystore não encontrado. Criando keystore...');
  execSync(`keytool -genkey -v -keystore ${keystorePath} -alias amigomontador -keyalg RSA -keysize 2048 -validity 10000 -storepass amigomontador123 -keypass amigomontador123 -dname "CN=AmigoMontador, OU=Development, O=AmigoMontador, L=São Paulo, ST=SP, C=BR"`, { stdio: 'inherit' });
}

// 2. Criar configuração de assinatura
const gradlePropertiesContent = `
android.useAndroidX=true
android.enableJetifier=true

# Configurações de assinatura
MYAPP_UPLOAD_STORE_FILE=../../amigomontador-keystore.jks
MYAPP_UPLOAD_KEY_ALIAS=amigomontador
MYAPP_UPLOAD_STORE_PASSWORD=amigomontador123
MYAPP_UPLOAD_KEY_PASSWORD=amigomontador123
`;

fs.writeFileSync('./android/gradle.properties', gradlePropertiesContent);

// 3. Atualizar build.gradle para assinatura
const buildGradlePath = './android/app/build.gradle';
let buildGradleContent = fs.readFileSync(buildGradlePath, 'utf8');

// Adicionar configuração de assinatura se não existir
if (!buildGradleContent.includes('signingConfigs')) {
  const signingConfig = `
android {
    signingConfigs {
        release {
            if (project.hasProperty('MYAPP_UPLOAD_STORE_FILE')) {
                storeFile file(MYAPP_UPLOAD_STORE_FILE)
                storePassword MYAPP_UPLOAD_STORE_PASSWORD
                keyAlias MYAPP_UPLOAD_KEY_ALIAS
                keyPassword MYAPP_UPLOAD_KEY_PASSWORD
            }
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
`;
  
  buildGradleContent = buildGradleContent.replace(
    /android\s*\{/,
    signingConfig
  );
  
  fs.writeFileSync(buildGradlePath, buildGradleContent);
}

// 4. Copiar arquivos web para Android
console.log('📁 Copiando arquivos web...');
if (fs.existsSync('./dist/client')) {
  execSync('cp -r ./dist/client/* ./android/app/src/main/assets/public/', { stdio: 'inherit' });
} else {
  console.log('⚠️ Pasta dist/client não encontrada, usando arquivos existentes');
}

// 5. Gerar AAB
console.log('🏗️ Gerando AAB assinado...');
try {
  process.chdir('./android');
  execSync('./gradlew bundleRelease', { stdio: 'inherit' });
  
  // Verificar se AAB foi gerado
  const aabPath = './app/build/outputs/bundle/release/app-release.aab';
  if (fs.existsSync(aabPath)) {
    console.log('✅ AAB gerado com sucesso!');
    console.log(`📍 Localização: ${path.resolve(aabPath)}`);
    
    // Copiar AAB para raiz do projeto
    execSync(`cp "${aabPath}" "../amigomontador-release.aab"`);
    console.log('✅ AAB copiado para raiz do projeto: amigomontador-release.aab');
    
    // Mostrar informações do AAB
    const stats = fs.statSync(aabPath);
    console.log(`📊 Tamanho do AAB: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    
  } else {
    console.error('❌ AAB não foi gerado');
  }
  
} catch (error) {
  console.error('❌ Erro ao gerar AAB:', error.message);
} finally {
  process.chdir('..');
}

console.log('🎯 Processo concluído!');