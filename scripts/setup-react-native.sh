#!/bin/bash

echo "🚀 Configurando AmigoMontador React Native Puro"
echo ""

# Verificar se está no diretório correto
if [ ! -f "package.json" ]; then
    echo "❌ Execute este script no diretório raiz do projeto"
    exit 1
fi

echo "📱 Preparando ambiente React Native..."

# Criar estrutura de projeto React Native se não existir
if [ ! -d "react-native-app" ]; then
    echo "📁 Criando estrutura React Native..."
    mkdir -p react-native-app/src/{components,screens,services,types,utils}
    mkdir -p react-native-app/android/app/src/main/java/com/amigomontador/app
    mkdir -p react-native-app/android/app/src/main/res/{drawable,layout,values}
fi

cd react-native-app

echo "📦 Instalando dependências React Native..."

# Criar package.json básico se não existir
if [ ! -f "package.json" ]; then
    cat > package.json << 'EOF'
{
  "name": "AmigoMontadorNative",
  "version": "1.0.0",
  "main": "index.js",
  "scripts": {
    "android": "react-native run-android",
    "start": "react-native start",
    "install-deps": "npm install --legacy-peer-deps"
  },
  "dependencies": {
    "react": "18.2.0",
    "react-native": "0.72.0"
  }
}
EOF
fi

# Instalar dependências básicas primeiro
npm install --legacy-peer-deps

echo "🔧 Configurando estrutura Android..."

# Criar AndroidManifest.xml
mkdir -p android/app/src/main
cat > android/app/src/main/AndroidManifest.xml << 'EOF'
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.amigomontador.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="AmigoMontador"
        android:theme="@style/AppTheme">
        
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:launchMode="singleTask"
            android:theme="@style/AppTheme.NoActionBarLaunch">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>
EOF

# Criar build.gradle básico
mkdir -p android/app
cat > android/app/build.gradle << 'EOF'
apply plugin: "com.android.application"

android {
    compileSdkVersion 34
    
    defaultConfig {
        applicationId "com.amigomontador.app"
        minSdkVersion 21
        targetSdkVersion 34
        versionCode 1
        versionName "1.0"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile("proguard-android.txt"), "proguard-rules.pro"
        }
    }
}

dependencies {
    implementation fileTree(dir: "libs", include: ["*.jar"])
    implementation 'com.facebook.react:react-native:+'
}
EOF

echo "📱 Preparando para compilação Android..."

echo "✅ Setup React Native concluído!"
echo ""
echo "📋 Próximos passos:"
echo "1. Instalar Android Studio"
echo "2. Configurar Android SDK"
echo "3. Conectar dispositivo Android ou iniciar emulador"
echo "4. Executar: cd react-native-app && npm run android"
echo ""
echo "📚 Documentação completa: docs/REACT_NATIVE_SETUP.md"
echo ""
echo "🎯 Para testar agora:"
echo "   cd react-native-app"
echo "   npm install --legacy-peer-deps"
echo "   npm run android (com dispositivo/emulador conectado)"