import fs from 'fs';
import path from 'path';

// Script mais seguro para preparar produção
console.log('Preparando projeto para produção...');

// 1. Criar configuração Capacitor otimizada
const capacitorConfig = `import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.amigomontador.app',
  appName: 'AmigoMontador',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#2563EB",
      showSpinner: false
    },
    StatusBar: {
      style: "dark", 
      backgroundColor: "#2563EB"
    }
  }
};

export default config;
`;

fs.writeFileSync('capacitor.config.ts', capacitorConfig);

// 2. Criar script de build para Android
const buildScript = `#!/bin/bash

echo "Building for production..."

# Build frontend
npm run build

# Sync with Capacitor
npx cap sync android

echo "Ready for Android build!"
`;

fs.writeFileSync('build-prod.sh', buildScript);
fs.chmodSync('build-prod.sh', '755');

// 3. Criar build.gradle para Android
const androidDir = 'android/app';
if (!fs.existsSync(androidDir)) {
  fs.mkdirSync(androidDir, { recursive: true });
}

const buildGradle = `plugins {
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
            minifyEnabled true
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt')
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
}
`;

fs.writeFileSync('android/app/build.gradle', buildGradle);

// 4. Atualizar package.json
const packagePath = 'package.json';
if (fs.existsSync(packagePath)) {
  const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
  pkg.scripts = {
    ...pkg.scripts,
    'build:prod': './build-prod.sh',
    'android:build': 'cd android && ./gradlew bundleRelease'
  };
  fs.writeFileSync(packagePath, JSON.stringify(pkg, null, 2));
}

console.log('Projeto preparado para produção!');
console.log('Execute: npm run build:prod');