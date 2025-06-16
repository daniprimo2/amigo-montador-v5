# Amigo Montador - Projeto Android Studio

## Como abrir no emulador da sua IDE

### Pré-requisitos
- Android Studio instalado
- JDK 8 ou superior
- Android SDK (API 22-34)
- Emulador Android configurado

### Passos para importar e executar

#### 1. Importar o projeto
1. Abra o Android Studio
2. Clique em "Open an existing Android Studio project"
3. Navegue até a pasta `android-project`
4. Selecione a pasta e clique "OK"

#### 2. Configurar o projeto
1. Aguarde o Gradle sincronizar automaticamente
2. Se aparecer erro de SDK, vá em File > Project Structure > SDK Location
3. Configure o caminho do Android SDK
4. Aceite as licenças se solicitado

#### 3. Configurar emulador
1. No Android Studio, vá em Tools > AVD Manager
2. Clique "Create Virtual Device"
3. Escolha um dispositivo (ex: Pixel 4)
4. Selecione uma imagem do sistema (API 28+ recomendado)
5. Clique "Finish"

#### 4. Executar o app
1. Clique no ícone de "play" verde (▶️) na toolbar
2. Selecione o emulador criado
3. Aguarde o emulador iniciar
4. O app será instalado e executado automaticamente

### Funcionalidades do app

- **WebView**: Carrega https://workspace.amigomontador01.replit.app
- **Permissões**: Câmera, localização, armazenamento
- **Upload de arquivos**: Funcional através do WebView
- **Navegação**: Botão voltar nativo funciona
- **Responsivo**: Interface adaptada para mobile

### Estrutura do projeto

```
android-project/
├── app/
│   ├── build.gradle           # Configurações do módulo
│   ├── src/main/
│   │   ├── AndroidManifest.xml    # Permissões e configurações
│   │   ├── java/com/amigomontador/app/
│   │   │   └── MainActivity.java  # Activity principal com WebView
│   │   └── res/
│   │       ├── layout/
│   │       │   └── activity_main.xml  # Layout da tela
│   │       ├── values/
│   │       │   ├── strings.xml    # Textos do app
│   │       │   ├── colors.xml     # Cores
│   │       │   └── themes.xml     # Temas
│   │       └── xml/
│   │           └── file_paths.xml # Configuração FileProvider
├── build.gradle               # Configurações do projeto
└── settings.gradle           # Configurações Gradle
```

### Solução de problemas

#### Erro de sincronização Gradle
- File > Invalidate Caches and Restart
- Build > Clean Project
- Build > Rebuild Project

#### Emulador não inicia
- Verifique se a virtualização está habilitada no BIOS
- Certifique-se que o Hyper-V está desabilitado (Windows)
- Tente criar um novo AVD com configurações diferentes

#### App não carrega o site
- Verifique a conexão com internet do emulador
- No emulador, abra o navegador e teste se acessa sites normalmente
- Verifique se o servidor Replit está funcionando

#### Permissões negadas
- No emulador, vá em Settings > Apps > Amigo Montador > Permissions
- Conceda as permissões necessárias manualmente

### Personalização

#### Alterar URL do app
Edite o arquivo `MainActivity.java` na linha:
```java
String appUrl = "https://workspace.amigomontador01.replit.app";
```

#### Alterar ícone do app
Substitua os arquivos em `res/mipmap-*/ic_launcher.png`

#### Alterar nome do app
Edite `res/values/strings.xml`:
```xml
<string name="app_name">Seu Nome Aqui</string>
```

### Gerar APK para teste

1. Build > Generate Signed Bundle / APK
2. Escolha "APK"
3. Configure keystore (ou crie novo)
4. Selecione "release"
5. O APK será gerado em `app/build/outputs/apk/release/`

### Depuração

- Use o Logcat para ver logs: View > Tool Windows > Logcat
- Adicione breakpoints no código Java
- Use Chrome DevTools para depurar o WebView:
  1. No Chrome, acesse `chrome://inspect`
  2. Selecione seu dispositivo/emulador
  3. Clique "inspect" no WebView

### Suporte

Este projeto é uma versão WebView do app Amigo Montador que carrega o site em um container nativo Android, permitindo funcionalidades móveis como câmera, localização e upload de arquivos.