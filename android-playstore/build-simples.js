#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// ====== CONFIGURAÇÃO SIMPLES - EDITE APENAS AQUI ======
const CONFIG = {
  appName: 'Amigo Montador',
  appUrl: 'https://amigomontador.replit.app', // Mude para sua URL
  packageName: 'com.amigomontador.app',
  keystorePassword: 'amigomontador123'
};
// =====================================================

console.log(`🚀 Gerando ${CONFIG.appName} para Play Store\n`);

// Passo 1: Verificar Java
try {
  execSync('java -version', { stdio: 'pipe' });
  console.log('✅ Java OK');
} catch {
  console.log('❌ Instale Java: sudo apt install openjdk-11-jdk');
  process.exit(1);
}

// Passo 2: Configurar URL no app
console.log('🌐 Configurando URL...');
if (!fs.existsSync('./app')) {
  fs.mkdirSync('./app/src/main/java/com/amigomontador/app', { recursive: true });
}

const mainActivity = `package com.amigomontador.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.webkit.WebSettings;

public class MainActivity extends Activity {
    private static final String APP_URL = "${CONFIG.appUrl}";
    
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl(APP_URL);
        setContentView(webView);
    }
}`;

fs.writeFileSync('./app/src/main/java/com/amigomontador/app/MainActivity.java', mainActivity);
console.log(`✅ URL configurada: ${CONFIG.appUrl}`);

// Passo 3: Criar arquivos básicos do Android
console.log('📱 Criando estrutura Android...');

// AndroidManifest.xml
const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="${CONFIG.packageName}">
    
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    
    <application
        android:label="${CONFIG.appName}"
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen">
        
        <activity android:name=".MainActivity"
                  android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

fs.mkdirSync('./app/src/main', { recursive: true });
fs.writeFileSync('./app/src/main/AndroidManifest.xml', manifest);

// build.gradle
const buildGradle = `plugins {
    id 'com.android.application'
}

android {
    namespace '${CONFIG.packageName}'
    compileSdk 34
    
    defaultConfig {
        applicationId "${CONFIG.packageName}"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    
    signingConfigs {
        release {
            storeFile file('keystore.jks')
            storePassword '${CONFIG.keystorePassword}'
            keyAlias 'app-key'
            keyPassword '${CONFIG.keystorePassword}'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}`;

fs.writeFileSync('./app/build.gradle', buildGradle);

// gradle.properties
fs.writeFileSync('./gradle.properties', 'android.useAndroidX=true');

// settings.gradle
fs.writeFileSync('./settings.gradle', "include ':app'");

// build.gradle raiz
const rootBuildGradle = `plugins {
    id 'com.android.application' version '8.1.0' apply false
}`;

fs.writeFileSync('./build.gradle', rootBuildGradle);

console.log('✅ Estrutura criada');

// Passo 4: Criar keystore
console.log('🔐 Criando keystore...');
if (!fs.existsSync('./app/keystore.jks')) {
  try {
    execSync(`keytool -genkey -v -keystore ./app/keystore.jks -alias app-key -keyalg RSA -keysize 2048 -validity 10000 -storepass ${CONFIG.keystorePassword} -keypass ${CONFIG.keystorePassword} -dname "CN=${CONFIG.appName}, OU=Dev, O=App, L=SP, ST=SP, C=BR"`, { stdio: 'inherit' });
    console.log('✅ Keystore criado');
  } catch (error) {
    console.log('❌ Erro no keystore:', error.message);
    process.exit(1);
  }
} else {
  console.log('✅ Keystore já existe');
}

// Passo 5: Gerar AAB
console.log('📦 Gerando AAB...');
try {
  // Criar gradlew se não existir
  if (!fs.existsSync('./gradlew')) {
    execSync('gradle wrapper', { stdio: 'inherit' });
  }
  
  execSync('./gradlew bundleRelease', { stdio: 'inherit' });
  
  const aabSource = './app/build/outputs/bundle/release/app-release.aab';
  const aabDest = './amigomontador-playstore.aab';
  
  if (fs.existsSync(aabSource)) {
    fs.copyFileSync(aabSource, aabDest);
    const size = (fs.statSync(aabDest).size / 1024).toFixed(2);
    
    console.log(`\n🎉 PRONTO! AAB gerado com sucesso!`);
    console.log(`📁 Arquivo: amigomontador-playstore.aab`);
    console.log(`📏 Tamanho: ${size} KB`);
    console.log(`🌐 URL do app: ${CONFIG.appUrl}`);
    console.log(`\n📋 Para Play Store:`);
    console.log(`1. Acesse: https://play.google.com/console`);
    console.log(`2. Crie novo app: ${CONFIG.appName}`);
    console.log(`3. Faça upload: amigomontador-playstore.aab`);
    
  } else {
    throw new Error('AAB não foi gerado');
  }
  
} catch (error) {
  console.log('❌ Erro no build:', error.message);
  console.log('\n🔧 Tente:');
  console.log('1. ./gradlew clean');
  console.log('2. Executar novamente');
  process.exit(1);
}