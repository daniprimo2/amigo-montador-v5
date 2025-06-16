#!/usr/bin/env node

const fs = require('fs');
const { execSync } = require('child_process');

// ========== CONFIGURAÇÃO ==========
// Edite apenas estas 3 linhas:
const APP_NAME = 'Amigo Montador';
const APP_URL = 'https://amigomontador.replit.app';
const PACKAGE = 'com.amigomontador.app';
// ==================================

console.log(`🚀 Gerando ${APP_NAME} para Google Play Store\n`);

// Verificar Java
try {
  execSync('java -version', { stdio: 'pipe' });
  console.log('✅ Java instalado');
} catch {
  console.log('❌ Instale Java primeiro:\n   sudo apt install openjdk-11-jdk');
  process.exit(1);
}

// Criar diretórios
const dirs = [
  'android/app/src/main/java/com/amigomontador/app',
  'android/app/src/main/res/values'
];
dirs.forEach(dir => fs.mkdirSync(dir, { recursive: true }));

// MainActivity.java
fs.writeFileSync('android/app/src/main/java/com/amigomontador/app/MainActivity.java', 
`package com.amigomontador.app;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        WebView webView = new WebView(this);
        webView.getSettings().setJavaScriptEnabled(true);
        webView.getSettings().setDomStorageEnabled(true);
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("${APP_URL}");
        setContentView(webView);
    }
}`);

// AndroidManifest.xml
fs.writeFileSync('android/app/src/main/AndroidManifest.xml',
`<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="${PACKAGE}">
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    
    <application android:label="${APP_NAME}" android:theme="@android:style/Theme.Black.NoTitleBar.Fullscreen">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`);

// build.gradle (app)
fs.writeFileSync('android/app/build.gradle',
`plugins { id 'com.android.application' }
android {
    namespace '${PACKAGE}'
    compileSdk 34
    defaultConfig {
        applicationId "${PACKAGE}"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }
    signingConfigs {
        release {
            storeFile file('app.jks')
            storePassword 'senha123'
            keyAlias 'app'
            keyPassword 'senha123'
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled false
        }
    }
}`);

// build.gradle (raiz)
fs.writeFileSync('android/build.gradle',
`plugins { id 'com.android.application' version '8.1.0' apply false }`);

// settings.gradle
fs.writeFileSync('android/settings.gradle', "include ':app'");

// gradle.properties
fs.writeFileSync('android/gradle.properties', 'android.useAndroidX=true');

console.log('📱 Arquivos Android criados');

// Criar keystore
if (!fs.existsSync('android/app/app.jks')) {
  console.log('🔐 Criando keystore...');
  execSync('keytool -genkey -v -keystore android/app/app.jks -alias app -keyalg RSA -keysize 2048 -validity 10000 -storepass senha123 -keypass senha123 -dname "CN=App"', { stdio: 'pipe' });
  console.log('✅ Keystore criado');
}

// Gerar AAB
console.log('📦 Gerando AAB...');
process.chdir('android');

if (!fs.existsSync('gradlew')) {
  execSync('gradle wrapper', { stdio: 'inherit' });
}

execSync('./gradlew bundleRelease', { stdio: 'inherit' });

// Copiar AAB
const aabSource = 'app/build/outputs/bundle/release/app-release.aab';
const aabDest = '../app-playstore.aab';

if (fs.existsSync(aabSource)) {
  fs.copyFileSync(aabSource, aabDest);
  const size = (fs.statSync(aabDest).size / 1024).toFixed(2);
  
  console.log(`\n🎉 PRONTO! Arquivo gerado: app-playstore.aab (${size} KB)`);
  console.log(`\n📋 Para publicar na Play Store:`);
  console.log(`1. Acesse: play.google.com/console`);
  console.log(`2. Crie novo app: ${APP_NAME}`);
  console.log(`3. Faça upload do arquivo: app-playstore.aab`);
  console.log(`4. Configure store listing e publique`);
  
} else {
  console.log('❌ Erro: AAB não foi gerado');
  process.exit(1);
}