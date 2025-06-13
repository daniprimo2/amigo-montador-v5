#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Criar estrutura completa para APK/AAB
const createAndroidProject = () => {
  console.log('🚀 Criando projeto Android completo...');

  // Criar diretórios necessários
  const dirs = [
    'android-build/app/src/main/java/com/amigomontador/app',
    'android-build/app/src/main/res/values',
    'android-build/app/src/main/res/mipmap-hdpi',
    'android-build/app/src/main/res/mipmap-mdpi', 
    'android-build/app/src/main/res/mipmap-xhdpi',
    'android-build/app/src/main/res/mipmap-xxhdpi',
    'android-build/app/src/main/res/mipmap-xxxhdpi',
    'android-build/app/src/main/assets'
  ];

  dirs.forEach(dir => {
    fs.mkdirSync(dir, { recursive: true });
  });

  // Copiar arquivos web para assets
  if (fs.existsSync('dist/client')) {
    console.log('📋 Copiando arquivos web...');
    fs.cpSync('dist/client', 'android-build/app/src/main/assets', { recursive: true });
  }

  // Criar MainActivity.java
  const mainActivity = `package com.amigomontador.app;

import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebSettings;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

public class MainActivity extends AppCompatActivity {
    private WebView webView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        webView = new WebView(this);
        setContentView(webView);
        
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setAllowFileAccess(true);
        webSettings.setAllowContentAccess(true);
        
        webView.setWebViewClient(new WebViewClient());
        webView.loadUrl("file:///android_asset/index.html");
    }
    
    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }
}`;

  fs.writeFileSync('android-build/app/src/main/java/com/amigomontador/app/MainActivity.java', mainActivity);

  // Criar AndroidManifest.xml
  const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.amigomontador.app"
    android:versionCode="1"
    android:versionName="1.0.0">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <uses-sdk android:minSdkVersion="22" android:targetSdkVersion="34" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.Material.Light.NoActionBar">

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:screenOrientation="portrait">
            
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`;

  fs.writeFileSync('android-build/app/src/main/AndroidManifest.xml', manifest);

  // Criar strings.xml
  const strings = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AmigoMontador</string>
</resources>`;

  fs.writeFileSync('android-build/app/src/main/res/values/strings.xml', strings);

  // Criar build.gradle para app
  const appGradle = `plugins {
    id 'com.android.application'
}

android {
    namespace 'com.amigomontador.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.amigomontador.app"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0.0"
    }

    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
    
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_1_8
        targetCompatibility JavaVersion.VERSION_1_8
    }

    bundle {
        language {
            enableSplit = false
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.webkit:webkit:1.8.0'
}`;

  fs.writeFileSync('android-build/app/build.gradle', appGradle);

  // Criar build.gradle raiz
  const rootGradle = `buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.1.4'
    }
}

plugins {
    id 'com.android.application' version '8.1.4' apply false
}`;

  fs.writeFileSync('android-build/build.gradle', rootGradle);

  // Criar settings.gradle
  const settings = `pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "AmigoMontador"
include ':app'`;

  fs.writeFileSync('android-build/settings.gradle', settings);

  // Criar gradle.properties
  const gradleProps = `android.useAndroidX=true
android.enableJetifier=true
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.nonTransitiveRClass=true`;

  fs.writeFileSync('android-build/gradle.properties', gradleProps);

  console.log('✅ Projeto Android criado em android-build/');
  console.log('📱 Pronto para gerar AAB!');
};

createAndroidProject();