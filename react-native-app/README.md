# AmigoMontador - React Native App

## Visão Geral

Aplicativo React Native completo para conectar lojas de móveis com montadores profissionais. O app funciona totalmente offline com banco de dados SQLite integrado e todas as funcionalidades necessárias para gerar AAB para a Play Store.

## Estrutura do Projeto

```
react-native-app/
├── src/
│   ├── types/
│   │   └── database.ts          # Tipos do banco de dados
│   ├── services/
│   │   ├── database.ts          # Banco SQLite integrado
│   │   ├── auth.ts              # Serviço de autenticação
│   │   └── api.ts               # Serviço de API (opcional)
│   ├── contexts/
│   │   └── AuthContext.tsx      # Contexto de autenticação
│   ├── screens/
│   │   ├── LoginScreen.tsx      # Tela de login
│   │   ├── HomeScreen.tsx       # Dashboard principal
│   │   ├── RegisterScreen.tsx   # Cadastro de usuários
│   │   ├── ProfileScreen.tsx    # Perfil do usuário
│   │   ├── ServicesScreen.tsx   # Gerenciamento de serviços
│   │   └── ChatScreen.tsx       # Chat em tempo real
│   └── App.tsx                  # Componente principal
├── android/                     # Configurações Android
│   ├── app/
│   │   ├── build.gradle         # Build Android
│   │   └── src/main/
│   │       ├── AndroidManifest.xml
│   │       ├── java/com/amigomontador/app/
│   │       └── res/
│   ├── build.gradle             # Build raiz
│   └── gradle.properties        # Propriedades Gradle
├── package.json                 # Dependências React Native
└── index.js                     # Ponto de entrada
```

## Funcionalidades Integradas

### Sistema de Banco de Dados
- **SQLite Local**: Banco de dados completo integrado
- **11 Tabelas**: users, stores, assemblers, services, applications, messages, ratings, bank_accounts
- **Suporte Offline**: Funciona sem conexão com internet
- **Sincronização**: Preparado para sync quando online

### Autenticação
- **Login/Registro**: Sistema completo de autenticação
- **Tipos de Usuário**: Lojistas e Montadores
- **Sessão Persistente**: Mantém login entre reinicializações
- **Perfis Completos**: Documentos, especialidades, avaliações

### Funcionalidades Principais
- **Gestão de Serviços**: Criação, candidatura e acompanhamento
- **Chat em Tempo Real**: Comunicação entre usuários
- **Geolocalização**: Cálculo de distâncias e localização
- **Sistema de Avaliações**: Ratings bidirecionais
- **PIX Integration**: Pagamentos e comprovantes
- **Upload de Arquivos**: Documentos e fotos de projetos

## Como Gerar o AAB

### Pré-requisitos
1. **Node.js 16+**
2. **Android Studio**
3. **Java JDK 11+**
4. **Android SDK API 21-34**

### Passos para Geração

1. **Instalar Dependências**
```bash
cd react-native-app
npm install
```

2. **Configurar Assinatura (Produção)**
```bash
# Gerar keystore (apenas primeira vez)
keytool -genkey -v -keystore amigomontador-release-key.keystore -alias amigomontador-key-alias -keyalg RSA -keysize 2048 -validity 10000

# Copiar keystore para android/app/
cp amigomontador-release-key.keystore android/app/
```

3. **Configurar gradle.properties**
```properties
# Já configurado em android/gradle.properties
MYAPP_UPLOAD_STORE_FILE=amigomontador-release-key.keystore
MYAPP_UPLOAD_KEY_ALIAS=amigomontador-key-alias
MYAPP_UPLOAD_STORE_PASSWORD=amigomontador123
MYAPP_UPLOAD_KEY_PASSWORD=amigomontador123
```

4. **Gerar AAB**
```bash
# Método 1: Via npm script
npm run generate-aab

# Método 2: Via Gradle diretamente
cd android
./gradlew bundleRelease

# O arquivo AAB será gerado em:
# android/app/build/outputs/bundle/release/app-release.aab
```

### Verificação do AAB

```bash
# Verificar estrutura do AAB
unzip -l android/app/build/outputs/bundle/release/app-release.aab

# Validar assinatura
jarsigner -verify -verbose -certs android/app/build/outputs/bundle/release/app-release.aab
```

## Configurações do Android

### Permissões (AndroidManifest.xml)
- `INTERNET` - Comunicação online
- `ACCESS_FINE_LOCATION` - GPS preciso
- `CAMERA` - Fotos de documentos
- `READ_EXTERNAL_STORAGE` - Acesso a arquivos
- `CALL_PHONE` - Ligações diretas

### Build Configuration
- **Package**: `com.amigomontador.app`
- **Min SDK**: 21 (Android 5.0)
- **Target SDK**: 34 (Android 14)
- **Version Code**: 1
- **Version Name**: "1.0"

### Signing Configuration
- **Debug**: Keystore padrão do React Native
- **Release**: Keystore personalizado para produção

## Dependências Principais

### Core React Native
- `react`: 18.2.0
- `react-native`: 0.72.15

### Navegação
- `@react-navigation/native`: 6.1.9
- `@react-navigation/stack`: 6.3.20
- `react-native-screens`: 3.27.0
- `react-native-safe-area-context`: 4.7.4

### Banco de Dados e Storage
- `react-native-sqlite-storage`: 6.0.1
- `@react-native-async-storage/async-storage`: 1.19.5

### UI e Funcionalidades
- `react-native-vector-icons`: 10.0.2
- `react-native-linear-gradient`: 2.8.3
- `react-native-image-picker`: 7.1.0
- `react-native-geolocation-service`: 5.3.1

### Rede e API
- `axios`: 1.6.2
- `react-native-fs`: 2.20.0

## Scripts Disponíveis

```json
{
  "android": "react-native run-android",
  "start": "react-native start",
  "generate-aab": "cd android && ./gradlew bundleRelease",
  "clean": "cd android && ./gradlew clean",
  "build:android": "cd android && ./gradlew assembleRelease"
}
```

## Estrutura do Banco de Dados

### Tabelas Principais

1. **users** - Dados básicos dos usuários
2. **stores** - Informações das lojas
3. **assemblers** - Dados dos montadores
4. **services** - Serviços disponíveis
5. **applications** - Candidaturas aos serviços
6. **messages** - Sistema de chat
7. **ratings** - Avaliações bidirecionais
8. **bank_accounts** - Dados bancários e PIX

### Relacionamentos
- User → Store (1:1)
- User → Assembler (1:1)
- Store → Services (1:N)
- Service → Applications (1:N)
- Service → Messages (1:N)
- Service → Ratings (1:N)
- User → BankAccounts (1:N)

## Preparação para Play Store

### Informações do App
- **Nome**: AmigoMontador
- **Package**: com.amigomontador.app
- **Categoria**: Produtividade
- **Classificação**: Livre

### Assets Necessários
- Ícone do app (512x512)
- Screenshots (1080x1920)
- Feature graphic (1024x500)
- Descrição em português

### Checklist Final
- [ ] AAB assinado corretamente
- [ ] Todas as permissões justificadas
- [ ] Testes em dispositivos físicos
- [ ] Compliance com políticas da Play Store
- [ ] Documentação de privacidade
- [ ] Versioning correto

## Troubleshooting

### Problemas Comuns

1. **Erro de Build Gradle**
```bash
cd android
./gradlew clean
./gradlew bundleRelease
```

2. **Erro de Assinatura**
```bash
# Verificar se keystore existe
ls -la android/app/amigomontador-release-key.keystore
```

3. **Dependências Não Encontradas**
```bash
npm install
cd ios && pod install (se necessário)
```

4. **Banco de Dados Não Inicializa**
```bash
# Limpar cache do Metro
npx react-native start --reset-cache
```

## Próximos Passos

1. **Teste completo** em dispositivo físico
2. **Upload** do AAB para Play Console
3. **Configuração** de metadados na Play Store
4. **Revisão** e publicação

## Suporte

Para dúvidas técnicas ou problemas de build, consulte:
- [Documentação React Native](https://reactnative.dev/)
- [Guia Android App Bundle](https://developer.android.com/guide/app-bundle)
- [Play Console Help](https://support.google.com/googleplay/android-developer/)