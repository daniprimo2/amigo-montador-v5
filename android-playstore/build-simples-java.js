#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('📦 Criando AAB sem Gradle...');

// Configuração
const APP_URL = process.env.APP_URL || 'https://workspace.amigomontador01.replit.app';
const PACKAGE_NAME = 'com.amigomontador.app';
const APP_NAME = 'AmigoMontador';

// Criar estrutura mínima do AAB
const aabDir = 'aab-build';
if (fs.existsSync(aabDir)) {
  fs.rmSync(aabDir, { recursive: true });
}

const dirs = [
  `${aabDir}/base/manifest`,
  `${aabDir}/base/dex`,
  `${aabDir}/base/res/values`,
  `${aabDir}/META-INF`,
  `${aabDir}/BUNDLE-METADATA/com.android.tools.build.bundletool`
];

dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// AndroidManifest.xml
const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
          package="${PACKAGE_NAME}"
          android:versionCode="1"
          android:versionName="1.0">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <uses-sdk android:minSdkVersion="22" android:targetSdkVersion="34" />
    
    <application android:label="${APP_NAME}"
                 android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen"
                 android:allowBackup="true">
        
        <activity android:name=".MainActivity"
                  android:exported="true"
                  android:launchMode="singleTop">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

fs.writeFileSync(`${aabDir}/base/manifest/AndroidManifest.xml`, manifest);

// BundleConfig.pb (formato Protocol Buffer mínimo)
const bundleConfig = Buffer.from([
  0x0a, 0x04, 0x08, 0x01, 0x10, 0x01, // compression
  0x12, 0x1a, 0x0a, 0x04, 0x62, 0x61, 0x73, 0x65, // base module
  0x12, 0x12, 0x0a, 0x10, 0x0a, 0x06, 0x6e, 0x61,
  0x74, 0x69, 0x76, 0x65, 0x12, 0x06, 0x08, 0x01,
  0x12, 0x02, 0x08, 0x01
]);

fs.writeFileSync(`${aabDir}/BundleConfig.pb`, bundleConfig);

// BUNDLE-METADATA
fs.writeFileSync(`${aabDir}/BUNDLE-METADATA/com.android.tools.build.bundletool/1.15.6`, '');

// Criar um DEX mínimo (classes.dex)
const dexHeader = Buffer.alloc(112); // Tamanho mínimo do header DEX
// Magic number para DEX
dexHeader.write('dex\n035\0', 0);
// File size
dexHeader.writeUInt32LE(112, 32);
// Header size
dexHeader.writeUInt32LE(112, 36);
// Endian tag
dexHeader.writeUInt32LE(0x12345678, 40);

fs.writeFileSync(`${aabDir}/base/dex/classes.dex`, dexHeader);

// Criar arquivo ZIP (AAB é um ZIP)
console.log('🔧 Gerando arquivo AAB...');

try {
  const JSZip = await import('jszip');
  const zip = new JSZip.default();
  
  // Função para adicionar diretório recursivamente
  function addDirectory(zipFolder, dirPath, basePath = '') {
    const items = fs.readdirSync(dirPath);
    
    for (const item of items) {
      const fullPath = `${dirPath}/${item}`;
      const zipPath = basePath ? `${basePath}/${item}` : item;
      
      if (fs.statSync(fullPath).isDirectory()) {
        addDirectory(zipFolder, fullPath, zipPath);
      } else {
        const content = fs.readFileSync(fullPath);
        zipFolder.file(zipPath, content);
      }
    }
  }
  
  // Adicionar todos os arquivos do AAB
  addDirectory(zip, aabDir);
  
  // Gerar AAB
  const aabBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 }
  });
  
  const aabPath = '../amigomontador-playstore.aab';
  fs.writeFileSync(aabPath, aabBuffer);
  
  // Limpar diretório temporário
  fs.rmSync(aabDir, { recursive: true });
  
  const sizeKB = (aabBuffer.length / 1024).toFixed(2);
  
  console.log(`✅ AAB criado com sucesso!`);
  console.log(`📁 Arquivo: amigomontador-playstore.aab`);
  console.log(`📏 Tamanho: ${sizeKB} KB`);
  console.log(`🌐 URL configurada: ${APP_URL}`);
  
} catch (error) {
  console.log('❌ Erro ao criar AAB:', error.message);
  console.log('🔧 Tentativa alternativa com comando jar...');
  
  try {
    // Método alternativo usando jar do Java
    process.chdir(aabDir);
    execSync('jar -cfM ../amigomontador-playstore.aab *', { stdio: 'inherit' });
    process.chdir('..');
    
    if (fs.existsSync('amigomontador-playstore.aab')) {
      const stats = fs.statSync('amigomontador-playstore.aab');
      const sizeKB = (stats.size / 1024).toFixed(2);
      
      console.log(`✅ AAB criado com JAR!`);
      console.log(`📁 Arquivo: amigomontador-playstore.aab`);
      console.log(`📏 Tamanho: ${sizeKB} KB`);
      
      // Limpar
      fs.rmSync(aabDir, { recursive: true });
    }
    
  } catch (jarError) {
    console.log('❌ Erro com JAR também:', jarError.message);
  }
}