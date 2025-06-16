# 🚀 Guia Completo - Download e Execução Local

## 📋 Pré-requisitos

### Obrigatórios:
- **Node.js 16+** - [Download aqui](https://nodejs.org/)
- **Java JDK 11** - [Download aqui](https://www.oracle.com/java/technologies/javase/jdk11-archive-downloads.html)
- **Android Studio** - [Download aqui](https://developer.android.com/studio)
- **Emulador Android** configurado e rodando

### Verificar instalação:
```bash
node --version
java -version
```

## 🔧 Configuração de Ambiente

### 1. Variáveis de Ambiente (Windows)
```bash
# Adicionar no PATH do sistema:
ANDROID_HOME=C:\Users\SeuUsuario\AppData\Local\Android\Sdk
JAVA_HOME=C:\Program Files\Java\jdk-11

# Verificar:
echo %ANDROID_HOME%
echo %JAVA_HOME%
```

### 2. Verificar emulador:
```bash
adb devices
# Deve mostrar: emulator-5554 device
```

## 📥 Download e Instalação

### 1. Baixar código:
- Baixe a pasta `react-native-app` completa do Replit
- Extraia para: `C:\v10\MontadorConecta\react-native-app`

### 2. Instalar dependências:
```bash
cd C:\v10\MontadorConecta\react-native-app
npm install
```

### 3. Verificar estrutura:
```
react-native-app/
├── android/
├── ios/
├── src/
├── package.json
├── index.js
└── node_modules/
```

## 🎯 Executar o App

### Método 1 - Comando principal:
```bash
cd C:\v10\MontadorConecta\react-native-app
npm run android
```

### Método 2 - React Native CLI:
```bash
npx @react-native-community/cli run-android
```

### Método 3 - Manual:
```bash
cd android
./gradlew clean
cd ..
npx react-native run-android
```

## 🔧 Resolver Problemas Comuns

### 1. Erro Java 17:
- ✅ **Já corrigido**: Projeto configurado para Java 11
- Verificar: `gradle.properties` tem `org.gradle.java.home=C:\\Program Files\\Java\\jdk-11`

### 2. Erro Gradle Wrapper:
- ✅ **Já corrigido**: `gradlew.bat` e `gradle-wrapper.properties` criados
- Gradle versão 7.6.1 (compatível com Java 11)

### 3. Dependências faltando:
```bash
npm install --legacy-peer-deps
```

### 4. Cache corrompido:
```bash
npx react-native start --reset-cache
```

### 5. Metro bundler não inicia:
```bash
npx react-native start
# Em outro terminal:
npx react-native run-android
```

## 📱 O que esperar

### ✅ App funcionando:
- **Tela de Login** com logo AmigoMontador
- **Sistema de navegação** entre telas
- **Banco SQLite** funcionando offline
- **6 telas principais**: Login, Home, Register, Profile, Services, Chat

### ⚠️ Warnings normais (podem aparecer):
- `react-native-sqlite-storage contains invalid configuration` - **Normal**
- Deprecation warnings do Gradle - **Normal**

## 🔍 Logs e Debug

### Ver logs do app:
```bash
npx react-native log-android
```

### Debug no Chrome:
1. Abrir app no emulador
2. Shake o dispositivo (Ctrl+M)
3. Selecionar "Debug"

## 📦 Estrutura do Projeto

```
src/
├── screens/          # Telas do app
│   ├── LoginScreen.tsx
│   ├── HomeScreen.tsx
│   ├── RegisterScreen.tsx
│   ├── ProfileScreen.tsx
│   ├── ServicesScreen.tsx
│   └── ChatScreen.tsx
├── services/         # Serviços e APIs
│   ├── database.ts   # SQLite database
│   ├── api.ts       # API calls
│   └── auth.ts      # Autenticação
├── context/         # Context providers
└── types/           # TypeScript types
```

## 🎯 Comandos Úteis

```bash
# Instalar dependências
npm install

# Executar no Android
npm run android

# Executar no iOS (se tiver Mac)
npm run ios

# Limpar cache
npm start -- --reset-cache

# Ver dispositivos conectados
adb devices

# Abrir menu de debug
adb shell input keyevent 82
```

## 🆘 Se tudo falhar

### Reset completo:
```bash
cd C:\v10\MontadorConecta\react-native-app

# 1. Limpar tudo
rm -rf node_modules
npm cache clean --force

# 2. Reinstalar
npm install

# 3. Limpar Android
cd android
./gradlew clean
cd ..

# 4. Executar
npm run android
```

## ✅ Checklist Final

- [ ] Node.js 16+ instalado
- [ ] Java JDK 11 instalado
- [ ] Android Studio + emulador rodando
- [ ] Variáveis ANDROID_HOME e JAVA_HOME configuradas
- [ ] `adb devices` mostra emulador conectado
- [ ] Pasta `react-native-app` baixada
- [ ] `npm install` executado com sucesso
- [ ] `npm run android` executado

---

**🎉 Pronto! O app AmigoMontador está rodando no seu emulador local!**

Para dúvidas ou problemas, execute os comandos passo a passo e me informe onde parou.