# Guia React Native Puro - AmigoMontador

## Visão Geral

Este guia mostra como converter e configurar o AmigoMontador como uma aplicação React Native pura para funcionar nativamente no Android.

## Estrutura da Aplicação React Native

```
react-native-app/
├── package.json           # Dependências React Native
├── index.js              # Ponto de entrada
├── src/
│   ├── App.tsx           # Componente principal
│   ├── screens/          # Telas da aplicação
│   │   ├── LoginScreen.tsx
│   │   ├── HomeScreen.tsx
│   │   ├── RegisterScreen.tsx
│   │   ├── ProfileScreen.tsx
│   │   ├── ServicesScreen.tsx
│   │   └── ChatScreen.tsx
│   ├── components/       # Componentes reutilizáveis
│   ├── services/         # Serviços e APIs
│   └── utils/           # Utilitários
└── android/             # Configuração Android
```

## Configuração do Ambiente

### Pré-requisitos
1. Node.js 16+
2. React Native CLI
3. Android Studio
4. Java JDK 11+
5. Android SDK

### Instalação
```bash
# Navegar para o diretório React Native
cd react-native-app

# Instalar dependências
npm install

# Para Android
npx react-native run-android
```

## Funcionalidades Implementadas

### Autenticação
- Tela de login com validação
- Tela de registro com tipos de usuário (Loja/Montador)
- Navegação segura entre telas

### Dashboard Principal
- Lista de serviços disponíveis
- Ações rápidas (Serviços, Chat, Perfil)
- Sistema de status e notificações
- Pull-to-refresh

### Gerenciamento de Serviços
- Três abas: Disponíveis, Candidaturas, Concluídos
- Candidatura a serviços
- Visualização detalhada
- Sistema de status visual

### Chat em Tempo Real
- Interface de mensagens instantâneas
- Envio e recebimento de mensagens
- Indicadores de status online
- Histórico de conversas

### Perfil de Usuário
- Visualização de dados pessoais
- Estatísticas do usuário
- Menu de navegação
- Configurações da conta

## Diferenças da Versão Web

### Vantagens React Native
✅ **Performance Nativa**: Execução direta no dispositivo
✅ **APIs Nativas**: Acesso completo ao hardware
✅ **Offline First**: Funciona sem internet
✅ **Push Notifications**: Notificações nativas
✅ **Câmera e Galeria**: Integração direta
✅ **Geolocalização**: GPS preciso
✅ **Armazenamento Local**: AsyncStorage

### Recursos Nativos Disponíveis
- Câmera para fotos de perfil e projetos
- GPS para localização precisa
- Notificações push para novos serviços
- Armazenamento offline de dados
- Acesso à galeria de fotos
- Ligações telefônicas diretas

## Configuração Android

### Permissões Necessárias
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.CALL_PHONE" />
```

### Build para Produção
```bash
# Gerar APK de debug
npx react-native run-android --variant=debug

# Gerar APK de produção
cd android
./gradlew assembleRelease

# Gerar AAB para Play Store
./gradlew bundleRelease
```

### Configuração de Assinatura
1. Gerar keystore para produção
2. Configurar gradle.properties
3. Assinar APK/AAB para Play Store

## Integração com Backend

### Configuração da API
```typescript
// src/services/api.ts
const BASE_URL = 'https://api.amigomontador.com';

export const apiService = {
  login: (credentials) => fetch(`${BASE_URL}/auth/login`),
  getServices: () => fetch(`${BASE_URL}/services`),
  sendMessage: (message) => fetch(`${BASE_URL}/chat/send`),
};
```

### WebSocket para Chat
```typescript
// src/services/websocket.ts
const wsUrl = 'wss://api.amigomontador.com/ws';
const socket = new WebSocket(wsUrl);

socket.onmessage = (event) => {
  const message = JSON.parse(event.data);
  // Processar mensagem
};
```

## Otimizações Mobile

### Performance
- Lazy loading de telas
- Optimização de imagens
- Cache de dados locais
- Minimização de re-renders

### UX Mobile
- Gestos nativos (swipe, pinch)
- Haptic feedback
- Orientação adaptável
- Safe areas para dispositivos

## Testes

### Teste no Emulador
```bash
# Iniciar emulador Android
emulator -avd Pixel_5_API_30

# Executar app
npx react-native run-android
```

### Teste em Dispositivo Físico
1. Ativar depuração USB
2. Conectar dispositivo
3. Executar: `npx react-native run-android`

## Deploy para Play Store

### Preparação
1. **Ícones**: Criar todos os tamanhos necessários
2. **Screenshots**: Capturar em diferentes dispositivos
3. **Descrição**: Texto em português para Play Store
4. **Política de Privacidade**: Link obrigatório

### Checklist Final
- [ ] APK assinado e testado
- [ ] Ícones em todas as resoluções
- [ ] Screenshots de qualidade
- [ ] Descrição completa em português
- [ ] Política de privacidade publicada
- [ ] Teste em dispositivos reais

## Próximos Passos

### Funcionalidades Avançadas
1. **Notificações Push**: Firebase Cloud Messaging
2. **Mapas**: React Native Maps
3. **Pagamentos**: Integração PIX
4. **Câmera**: React Native Camera
5. **Offline**: Redux Persist

### Melhorias de UX
1. **Animações**: React Native Reanimated
2. **Gestos**: React Native Gesture Handler
3. **Navegação**: Tab navigation
4. **Tema**: Dark mode

## Comandos Úteis

```bash
# Limpar cache Metro
npx react-native start --reset-cache

# Limpar build Android
cd android && ./gradlew clean

# Verificar dispositivos conectados
adb devices

# Instalar em dispositivo específico
npx react-native run-android --deviceId=DEVICE_ID

# Logs do dispositivo
npx react-native log-android
```

## Resolução de Problemas

### Erro de Build
- Limpar node_modules: `rm -rf node_modules && npm install`
- Limpar cache: `npx react-native start --reset-cache`
- Limpar build Android: `cd android && ./gradlew clean`

### Problemas de Conexão
- Verificar URL da API
- Confirmar permissões de rede
- Testar em dispositivo físico

### Performance
- Usar Flipper para debug
- Monitorar uso de memória
- Otimizar componentes pesados

---

**Conclusão**: A versão React Native oferece experiência nativa completa com acesso a todas as funcionalidades do dispositivo, proporcionando melhor performance e integração com o sistema Android.