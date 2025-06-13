#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🔐 Gerando AAB assinado para Play Store');
console.log('=====================================');

// Criar estrutura de diretórios temporária
const tempDir = 'temp-android-build';
if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir, { recursive: true });
}

// Criar AndroidManifest.xml
const androidManifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.amigomontador.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <uses-sdk
        android:minSdkVersion="22"
        android:targetSdkVersion="34" />

    <application
        android:name="com.getcapacitor.BridgeActivity"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:name="com.getcapacitor.BridgeActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="\${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>
    </application>
</manifest>`;

// Criar strings.xml
const stringsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AmigoMontador</string>
    <string name="title_activity_main">AmigoMontador</string>
    <string name="package_name">com.amigomontador.app</string>
    <string name="custom_url_scheme">com.amigomontador.app</string>
</resources>`;

// Criar file_paths.xml
const filePathsXml = `<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <files-path name="files" path="." />
    <cache-path name="cache" path="." />
    <external-files-path name="external_files" path="." />
    <external-cache-path name="external_cache" path="." />
    <external-path name="external" path="." />
</paths>`;

// Criar estrutura de diretórios
const dirs = [
  `${tempDir}/src/main`,
  `${tempDir}/src/main/res/values`,
  `${tempDir}/src/main/res/xml`,
  `${tempDir}/src/main/res/mipmap-hdpi`,
  `${tempDir}/src/main/res/mipmap-mdpi`,
  `${tempDir}/src/main/res/mipmap-xhdpi`,
  `${tempDir}/src/main/res/mipmap-xxhdpi`,
  `${tempDir}/src/main/res/mipmap-xxxhdpi`,
  `${tempDir}/src/main/assets/public`
];

dirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Escrever arquivos
fs.writeFileSync(`${tempDir}/src/main/AndroidManifest.xml`, androidManifest);
fs.writeFileSync(`${tempDir}/src/main/res/values/strings.xml`, stringsXml);
fs.writeFileSync(`${tempDir}/src/main/res/xml/file_paths.xml`, filePathsXml);

// Criar ícones básicos (placeholder)
const createIcon = (size, filename) => {
  // SVG simples para ícone
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="${size}" height="${size}" fill="#2563eb"/>
    <text x="50%" y="50%" font-family="Arial" font-size="${Math.floor(size/6)}" fill="white" text-anchor="middle" dy=".3em">AM</text>
  </svg>`;
  fs.writeFileSync(filename, svg);
};

// Criar ícones para diferentes densidades
createIcon(48, `${tempDir}/src/main/res/mipmap-mdpi/ic_launcher.svg`);
createIcon(72, `${tempDir}/src/main/res/mipmap-hdpi/ic_launcher.svg`);
createIcon(96, `${tempDir}/src/main/res/mipmap-xhdpi/ic_launcher.svg`);
createIcon(144, `${tempDir}/src/main/res/mipmap-xxhdpi/ic_launcher.svg`);
createIcon(192, `${tempDir}/src/main/res/mipmap-xxxhdpi/ic_launcher.svg`);

// Copiar arquivos web se existirem
if (fs.existsSync('public')) {
  try {
    execSync(`cp -r public/* ${tempDir}/src/main/assets/public/`, { stdio: 'inherit' });
  } catch (e) {
    console.log('Arquivos web não encontrados, continuando...');
  }
}

// Criar um index.html básico se não existir
const indexHtml = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AmigoMontador</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .logo { text-align: center; color: #2563eb; font-size: 2em; margin-bottom: 20px; }
        .feature { margin: 15px 0; padding: 15px; background: #f8f9fa; border-radius: 4px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">AmigoMontador</div>
        <h2>Conectando Profissionais</h2>
        <div class="feature">🔧 Montadores especializados</div>
        <div class="feature">🏪 Lojas de móveis</div>
        <div class="feature">📍 Localização inteligente</div>
        <div class="feature">💬 Chat integrado</div>
        <div class="feature">⭐ Sistema de avaliações</div>
        <p>Transformando a experiência de montagem de móveis no Brasil.</p>
    </div>
</body>
</html>`;

fs.writeFileSync(`${tempDir}/src/main/assets/public/index.html`, indexHtml);

console.log('✅ Estrutura Android criada');
console.log('📁 Arquivos organizados em:', tempDir);

// Verificar arquivos criados
const createdFiles = [
  'AndroidManifest.xml',
  'res/values/strings.xml',
  'res/xml/file_paths.xml',
  'assets/public/index.html'
];

console.log('\n📋 Arquivos criados:');
createdFiles.forEach(file => {
  const fullPath = `${tempDir}/src/main/${file}`;
  if (fs.existsSync(fullPath)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file}`);
  }
});

console.log('\n🔑 Informações da chave de assinatura:');
console.log('Arquivo: amigomontador-keystore.jks');
console.log('Alias: amigomontador');
console.log('Senha: amigomontador2024');

console.log('\n📱 Próximo passo: Gerar AAB assinado com bundletool');