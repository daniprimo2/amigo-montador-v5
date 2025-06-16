# Guia Completo: Gerar AAB no Android Studio

## Pré-requisitos

### 1. Instalar Android Studio
- Baixe o Android Studio: https://developer.android.com/studio
- Instale com todas as configurações padrão
- Aceite as licenças do Android SDK

### 2. Configurar SDK
- Abra Android Studio
- Vá em **File** → **Settings** → **Appearance & Behavior** → **System Settings** → **Android SDK**
- Instale **Android 14.0 (API 34)** e **Android 5.1 (API 22)**

## Passo a Passo para Gerar AAB

### PASSO 1: Abrir o Projeto

1. **Baixar o projeto**:
   - Baixe a pasta `android-studio-project` do seu Replit
   - Salve em uma pasta local (ex: `C:\AmigoMontador\android-studio-project`)

2. **Abrir no Android Studio**:
   - Abra o Android Studio
   - Clique em **"Open an existing Android Studio project"**
   - Navegue até a pasta `android-studio-project`
   - Selecione a pasta e clique **OK**

3. **Aguardar sincronização**:
   - O Android Studio vai sincronizar o projeto (pode levar alguns minutos)
   - Aguarde aparecer "BUILD SUCCESSFUL" na aba Build

### PASSO 2: Criar/Configurar Keystore

1. **Gerar keystore** (se não existir):
   - No menu: **Build** → **Generate Signed Bundle/APK**
   - Selecione **Android App Bundle**
   - Clique **Next**
   - Clique **Create new...**

2. **Configurar keystore**:
   ```
   Key store path: app/amigomontador-keystore.jks
   Password: amigomontador123
   Key alias: amigomontador-key  
   Key password: amigomontador123
   
   Certificate:
   First and Last Name: AmigoMontador
   Organizational Unit: Development
   Organization: AmigoMontador
   City: São Paulo
   State: SP
   Country Code: BR
   ```

3. **Salvar keystore**:
   - Clique **OK** para criar
   - O arquivo será salvo em `app/amigomontador-keystore.jks`

### PASSO 3: Gerar AAB Assinado

1. **Iniciar processo**:
   - Menu: **Build** → **Generate Signed Bundle/APK**
   - Selecione **Android App Bundle**
   - Clique **Next**

2. **Configurar assinatura**:
   - **Key store path**: Selecione `app/amigomontador-keystore.jks`
   - **Key store password**: `amigomontador123`
   - **Key alias**: `amigomontador-key`
   - **Key password**: `amigomontador123`
   - Clique **Next**

3. **Configurar build**:
   - **Destination Folder**: Escolha onde salvar o AAB
   - **Build Variants**: Selecione **release**
   - Marque **Export encrypted key**
   - Clique **Create**

### PASSO 4: Aguardar Geração

1. **Processo de build**:
   - O Android Studio vai compilar o projeto
   - Aguarde aparecer "BUILD SUCCESSFUL"
   - Uma notificação aparecerá quando concluído

2. **Localizar arquivo**:
   - O AAB será gerado em: `app/release/app-release.aab`
   - Ou na pasta que você escolheu no Destination Folder

### PASSO 5: Verificar AAB

1. **Verificar arquivo**:
   - Certifique-se que o arquivo `app-release.aab` foi criado
   - Tamanho deve ser entre 2-10 MB
   - Data de criação deve ser atual

2. **Testar localmente** (opcional):
   ```bash
   # Se você tiver bundletool instalado
   bundletool build-apks --bundle=app-release.aab --output=test.apks
   ```

## Método Alternativo: Via Linha de Comando

### Se preferir usar terminal:

1. **Abrir terminal** na pasta do projeto
2. **Limpar projeto**:
   ```bash
   ./gradlew clean
   ```

3. **Gerar AAB**:
   ```bash
   ./gradlew bundleRelease
   ```

4. **Localizar AAB**:
   - Arquivo gerado em: `app/build/outputs/bundle/release/app-release.aab`

## Configurações Importantes

### Arquivo build.gradle (app)
```gradle
android {
    namespace 'com.amigomontador.app'
    compileSdk 34

    defaultConfig {
        applicationId "com.amigomontador.app"
        minSdk 22
        targetSdk 34
        versionCode 1
        versionName "1.0"
    }

    signingConfigs {
        release {
            storeFile file('amigomontador-keystore.jks')
            storePassword 'amigomontador123'
            keyAlias 'amigomontador-key'
            keyPassword 'amigomontador123'
        }
    }
    
    buildTypes {
        release {
            signingConfig signingConfigs.release
        }
    }
}
```

## Resolução de Problemas

### Erro: "SDK not found"
- Instale Android SDK via Android Studio
- Configure ANDROID_HOME nas variáveis de ambiente

### Erro: "Keystore not found"
- Certifique-se que o keystore está na pasta `app/`
- Verifique os caminhos no build.gradle

### Erro: "Build failed"
- Execute `./gradlew clean`
- Tente novamente
- Verifique se tem conexão com internet

### Erro: "Invalid keystore format"
- Gere um novo keystore
- Use apenas caracteres alfanuméricos na senha

## Configurações do WebView

O app está configurado como WebView que carrega:
- **URL padrão**: https://amigomontador.replit.app
- **Permissões**: Internet, Câmera, Arquivos
- **JavaScript**: Habilitado
- **Armazenamento**: Local storage habilitado

### Para alterar a URL:
Edite o arquivo `MainActivity.java`:
```java
webView.loadUrl("https://sua-url-aqui.com");
```

## Informações do AAB Final

- **Package ID**: com.amigomontador.app
- **Versão**: 1.0 (código 1)
- **SDK mínimo**: Android 5.1 (API 22)
- **SDK alvo**: Android 14 (API 34)
- **Arquitetura**: Universal (ARM, x86)

## Próximos Passos

1. **Testar AAB**: Use bundletool ou emulador
2. **Upload Play Store**: Use o arquivo AAB gerado
3. **Preencher metadados**: Descrição, ícones, screenshots
4. **Publicar**: Submeter para revisão

## Arquivos Importantes

- `app-release.aab` - Arquivo para upload na Play Store
- `amigomontador-keystore.jks` - Keystore para assinatura (GUARDAR COM SEGURANÇA)
- `build.gradle` - Configurações do projeto

**IMPORTANTE**: Guarde o keystore com segurança. Sem ele, você não conseguirá atualizar o app na Play Store no futuro.