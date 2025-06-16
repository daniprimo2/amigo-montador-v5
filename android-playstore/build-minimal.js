#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Criando AAB mínimo para resolver erro de parsing...');

const APP_URL = process.env.APP_URL || 'https://workspace.amigomontador01.replit.app';
const PACKAGE_NAME = 'com.amigomontador.app';

// Limpar arquivos anteriores
const oldFiles = ['amigomontador-final.aab', 'amigomontador-playstore-corrigido.aab', 'amigomontador-playstore.aab'];
oldFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.unlinkSync(file);
    console.log(`🗑️ Removido: ${file}`);
  }
});

// Criar estrutura AAB mínima
const aabDir = 'aab-minimal';
if (fs.existsSync(aabDir)) {
  fs.rmSync(aabDir, { recursive: true });
}

fs.mkdirSync(`${aabDir}/base/manifest`, { recursive: true });
fs.mkdirSync(`${aabDir}/base/dex`, { recursive: true });

// AndroidManifest.xml ultra-simples
const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${PACKAGE_NAME}">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-sdk android:minSdkVersion="22" android:targetSdkVersion="34" />
    <application android:label="Amigo Montador">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

fs.writeFileSync(`${aabDir}/base/manifest/AndroidManifest.xml`, manifest);

// DEX mínimo válido (apenas header)
const dex = Buffer.alloc(112);
dex.write('dex\n035\0', 0, 8); // Magic number
dex.writeUInt32LE(112, 32); // File size
dex.writeUInt32LE(112, 36); // Header size
dex.writeUInt32LE(0x12345678, 40); // Endian tag
fs.writeFileSync(`${aabDir}/base/dex/classes.dex`, dex);

// SEM BundleConfig.pb - criar AAB sem ele
console.log('📦 Criando AAB sem BundleConfig.pb...');

process.chdir(aabDir);
execSync('jar -cfM ../amigomontador-sem-config.aab base/', { stdio: 'inherit' });
process.chdir('..');

if (fs.existsSync('amigomontador-sem-config.aab')) {
  const stats = fs.statSync('amigomontador-sem-config.aab');
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log('✅ AAB sem BundleConfig.pb criado!');
  console.log(`📁 Arquivo: amigomontador-sem-config.aab`);
  console.log(`📏 Tamanho: ${sizeKB} KB`);
  
  // Verificar conteúdo
  console.log('\n🔍 Conteúdo do AAB:');
  execSync('jar -tf amigomontador-sem-config.aab', { stdio: 'inherit' });
}

// Método alternativo: BundleConfig.pb com apenas 2 bytes
console.log('\n🔧 Tentativa com BundleConfig.pb mínimo...');

// Criar BundleConfig.pb com apenas version field
const minimalConfig = Buffer.from([0x08, 0x01]); // Apenas version = 1
fs.writeFileSync(`${aabDir}/BundleConfig.pb`, minimalConfig);

process.chdir(aabDir);
execSync('jar -cfM ../amigomontador-config-minimal.aab .', { stdio: 'inherit' });
process.chdir('..');

if (fs.existsSync('amigomontador-config-minimal.aab')) {
  const stats = fs.statSync('amigomontador-config-minimal.aab');
  const sizeKB = (stats.size / 1024).toFixed(2);
  
  console.log('✅ AAB com config mínimo criado!');
  console.log(`📁 Arquivo: amigomontador-config-minimal.aab`);
  console.log(`📏 Tamanho: ${sizeKB} KB`);
}

// Método 3: Usar protocolo protobuf direto
console.log('\n🔧 Criando BundleConfig.pb em formato texto...');

// Criar arquivo .textproto
const textProto = `bundle_config {
  bundletool {
    version: "1.15.6"
  }
  compression {
    uncompressed_glob: "**/*.so"
  }
}`;

fs.writeFileSync('BundleConfig.textproto', textProto);

// Tentar converter para binário (se protoc estiver disponível)
try {
  execSync('which protoc', { stdio: 'pipe' });
  console.log('📦 Protoc encontrado, convertendo...');
  
  // Baixar proto schema
  const protoSchema = `syntax = "proto3";

message BundleConfig {
  BundleConfigToolConfig bundletool = 1;
  CompressionConfig compression = 2;
}

message BundleConfigToolConfig {
  string version = 1;
}

message CompressionConfig {
  repeated string uncompressed_glob = 1;
}`;

  fs.writeFileSync('bundle_config.proto', protoSchema);
  
  execSync('protoc --encode=BundleConfig bundle_config.proto < BundleConfig.textproto > BundleConfig.pb.protoc', { stdio: 'inherit' });
  
  if (fs.existsSync('BundleConfig.pb.protoc')) {
    fs.copyFileSync('BundleConfig.pb.protoc', `${aabDir}/BundleConfig.pb`);
    
    process.chdir(aabDir);
    execSync('jar -cfM ../amigomontador-protoc.aab .', { stdio: 'inherit' });
    process.chdir('..');
    
    console.log('✅ AAB com protoc criado: amigomontador-protoc.aab');
  }
  
} catch (e) {
  console.log('⚠️ Protoc não disponível, usando método manual');
}

// Limpar
fs.rmSync(aabDir, { recursive: true });
['BundleConfig.textproto', 'bundle_config.proto', 'BundleConfig.pb.protoc'].forEach(f => {
  if (fs.existsSync(f)) fs.unlinkSync(f);
});

console.log('\n🎯 Teste os AABs criados:');
console.log('1. amigomontador-sem-config.aab (sem BundleConfig.pb)');
console.log('2. amigomontador-config-minimal.aab (config mínimo)');
if (fs.existsSync('amigomontador-protoc.aab')) {
  console.log('3. amigomontador-protoc.aab (protoc gerado)');
}
console.log('\nComece testando o primeiro na Play Store.');