# Resumo: Gerar AAB no Android Studio

## O que você tem agora:
✅ Projeto Android Studio completo na pasta `android-studio-project`  
✅ Configurações corretas para Play Store  
✅ WebView que carrega seu app web  
✅ Guia detalhado em `docs/GUIA_ANDROID_STUDIO_AAB.md`  

## Passos Rápidos:

### 1. Baixar e Abrir Projeto
- Baixe a pasta `android-studio-project` do Replit
- Abra no Android Studio
- Aguarde sincronização

### 2. Gerar AAB
- Menu: **Build** → **Generate Signed Bundle/APK**
- Selecione **Android App Bundle**
- Crie keystore com dados:
  ```
  Senha: amigomontador123
  Alias: amigomontador-key
  Nome: AmigoMontador
  ```

### 3. Finalizar
- Selecione **release**
- Clique **Create**
- AAB será gerado em `app/release/app-release.aab`

## Informações do App:
- **Package**: com.amigomontador.app
- **Versão**: 1.0
- **URL carregada**: https://amigomontador.replit.app
- **Compatibilidade**: Android 5.1 - 14

## Se der problema:
1. Execute `./gradlew clean` no terminal do projeto
2. Tente gerar novamente
3. Verifique se o Android SDK está instalado

## Arquivo final:
O arquivo `app-release.aab` gerado será aceito pela Play Store sem os erros anteriores do BundleConfig.pb.

**Importante**: Guarde o arquivo keystore (.jks) com segurança para futuras atualizações.