# Guia Definitivo - AmigoMontador React Native

## Pré-requisitos Obrigatórios

### 1. Node.js 16+
```bash
# Verificar se já tem instalado
node --version
npm --version
```
Se não tiver, baixe em: https://nodejs.org/

### 2. Java JDK 11
```bash
# Verificar se já tem instalado
java -version
```
Se não tiver, baixe OpenJDK 11 ou Oracle JDK 11

### 3. Android Studio Completo
- Baixe e instale: https://developer.android.com/studio
- Durante instalação, inclua:
  - Android SDK
  - Android SDK Platform-Tools
  - Android Emulator
  - Android SDK Build-Tools

### 4. Configurar Variáveis de Ambiente
Adicione no PATH do Windows:
```
ANDROID_HOME = C:\Users\SeuUsuario\AppData\Local\Android\Sdk
JAVA_HOME = C:\Program Files\Java\jdk-11
```

## Configuração do Emulador

### 1. Criar AVD (Android Virtual Device)
1. Abra Android Studio
2. Vá em Tools > AVD Manager
3. Create Virtual Device
4. Escolha: Pixel 4 ou similar
5. API Level: 30 ou superior
6. Finalize a criação

### 2. Iniciar Emulador
- No AVD Manager, clique no botão Play
- Aguarde o emulador carregar completamente

## Instalação do Projeto

### 1. Baixar e Preparar
```bash
# Baixe a pasta react-native-app do Replit
# Extraia para: C:\v10\MontadorConecta\react-native-app

# Navegue para a pasta
cd C:\v10\MontadorConecta\react-native-app
```

### 2. Limpar Arquivos Problemáticos
```bash
# Deletar arquivos que causam conflito
del react-native.config.js
del metro.config.js

# Verificar se deletou
dir
```

### 3. Instalar Dependências
```bash
# Limpar cache
npm cache clean --force

# Instalar dependências
npm install --legacy-peer-deps
```

### 4. Verificar Ambiente
```bash
# Verificar se emulador está conectado
adb devices

# Deve mostrar algo como:
# emulator-5554   device
```

## Executar o App

### Método 1: Via NPM Script
```bash
npm run android
```

### Método 2: React Native CLI Direto
```bash
npx react-native run-android
```

### Método 3: Se ainda der erro
```bash
npx @react-native-community/cli run-android --verbose
```

## Estrutura de Arquivos Necessária

Certifique-se que tem estes arquivos na pasta:
```
react-native-app/
├── package.json
├── index.js
├── babel.config.js
├── android/
│   ├── app/
│   ├── build.gradle
│   └── settings.gradle
├── src/
│   ├── App.tsx
│   ├── screens/
│   ├── services/
│   └── types/
└── tsconfig.json
```

## Troubleshooting

### Se der erro de "command unrecognized"
```bash
# Certifique-se que está na pasta correta
pwd
cd react-native-app
```

### Se der erro de configuração
```bash
# Limpar completamente
rmdir /s /q node_modules
npm cache clean --force
npm install --legacy-peer-deps
```

### Se emulador não aparece
```bash
# Listar dispositivos
adb devices

# Reiniciar ADB
adb kill-server
adb start-server
```

### Se build falhar
```bash
# Limpar build Android
cd android
.\gradlew clean
cd ..
npm run android
```

## Recursos do App

### Funcionalidades Implementadas
- Sistema de login/registro offline
- Banco SQLite integrado (11 tabelas)
- Contexto de autenticação React
- Navegação entre telas
- Interface mobile-first
- Tipos TypeScript completos

### Telas Disponíveis
- LoginScreen - Autenticação
- HomeScreen - Dashboard principal
- RegisterScreen - Cadastro usuários
- ProfileScreen - Perfil do usuário
- ServicesScreen - Gestão de serviços
- ChatScreen - Mensagens

## Gerar AAB para Play Store

Após app funcionando, para gerar arquivo de publicação:
```bash
# Executar script de build
.\build-aab.sh

# AAB será gerado em:
# android\app\build\outputs\bundle\release\app-release.aab
```

## Suporte

Se encontrar problemas:
1. Verificar se todos os pré-requisitos estão instalados
2. Certificar que emulador está rodando
3. Limpar cache e reinstalar dependências
4. Usar modo verbose para debug: `--verbose`

O app está configurado para funcionar imediatamente após seguir estes passos.