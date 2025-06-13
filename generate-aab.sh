#!/bin/bash

# Script para gerar AAB do AmigoMontador
echo "🚀 Gerando AAB para Play Store"
echo "=============================="

# Verificar se o diretório dist/client existe
if [ ! -d "dist/client" ]; then
    echo "❌ Diretório dist/client não encontrado"
    exit 1
fi

# Configurar variáveis de ambiente para Capacitor
export CAPACITOR_ANDROID_STUDIO_PATH=""
export JAVA_HOME="/usr/lib/jvm/java-11-openjdk-amd64"

# Tentar usar capacitor diretamente
echo "📱 Configurando projeto Android..."

# Criar estrutura básica do Android se não existir
if [ ! -d "android/app" ]; then
    echo "📁 Criando estrutura Android..."
    mkdir -p android/app/src/main/java/com/amigomontador/app
    mkdir -p android/app/src/main/res/values
    mkdir -p android/app/src/main/assets/public
fi

# Copiar arquivos web para assets
echo "📋 Copiando arquivos web..."
cp -r dist/client/* android/app/src/main/assets/public/ 2>/dev/null || true

# Criar arquivo básico de manifesto
cat > android/app/src/main/AndroidManifest.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.amigomontador.app">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@style/AppTheme">

        <activity
            android:exported="true"
            android:launchMode="singleTask"
            android:name=".MainActivity"
            android:theme="@style/AppTheme.NoActionBarLaunch">

            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>

        </activity>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths"></meta-data>
        </provider>
    </application>
</manifest>
EOF

# Criar strings.xml
cat > android/app/src/main/res/values/strings.xml << 'EOF'
<?xml version="1.0" encoding="utf-8"?>
<resources>
    <string name="app_name">AmigoMontador</string>
    <string name="title_activity_main">AmigoMontador</string>
    <string name="package_name">com.amigomontador.app</string>
    <string name="custom_url_scheme">amigomontador</string>
</resources>
EOF

# Criar build.gradle básico
cat > android/app/build.gradle << 'EOF'
apply plugin: 'com.android.application'

android {
    compileSdkVersion 34
    defaultConfig {
        applicationId "com.amigomontador.app"
        minSdkVersion 22
        targetSdkVersion 34
        versionCode 1
        versionName "1.0.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

dependencies {
    implementation 'androidx.appcompat:appcompat:1.6.1'
    implementation 'androidx.coordinatorlayout:coordinatorlayout:1.2.0'
    implementation 'androidx.webkit:webkit:1.8.0'
    implementation 'androidx.core:core-ktx:1.12.0'
}
EOF

echo ""
echo "✅ ESTRUTURA ANDROID CRIADA!"
echo ""
echo "📋 Para gerar o AAB:"
echo "1. Instale o Android Studio"
echo "2. Abra o projeto android/"
echo "3. Build > Generate Signed Bundle/APK"
echo "4. Escolha Android App Bundle (AAB)"
echo "5. Configure signing key"
echo "6. Gere o arquivo AAB"
echo ""
echo "📁 Arquivos preparados em: $(pwd)/android/"