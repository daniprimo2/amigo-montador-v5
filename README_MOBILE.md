# Amigo Montador - Aplicativo Multiplataforma

O Amigo Montador agora funciona como:
- **PWA (Progressive Web App)** - Instalável no navegador
- **Aplicativo Android nativo** - Via Capacitor
- **Aplicativo iOS nativo** - Via Capacitor

## Funcionalidades Móveis

### PWA (Web)
- Instalação automática no navegador
- Funcionamento offline com cache
- Notificações push
- Ícone na tela inicial
- Experiência nativa no mobile

### Android
- App nativo compilado com Capacitor
- Acesso completo às APIs do Android
- Publicação na Google Play Store
- Integração com sistema de notificações

### iOS
- App nativo compilado com Capacitor  
- Acesso às APIs do iOS
- Publicação na App Store
- Integração com sistema de notificações

## Como Usar

### Para Web/PWA:
1. Acesse o site no navegador móvel
2. Aparecerá prompt para instalar o app
3. Clique em "Instalar" para adicionar à tela inicial

### Para Build Android:
```bash
# Build da aplicação web
npm run build

# Sincronizar com Capacitor
npx cap sync android

# Abrir no Android Studio
npx cap open android

# Build direto (opcional)
npx cap build android
```

### Para Build iOS:
```bash
# Build da aplicação web  
npm run build

# Sincronizar com Capacitor
npx cap sync ios

# Abrir no Xcode (apenas macOS)
npx cap open ios

# Build direto (opcional)
npx cap build ios
```

## Script Automatizado

Execute o script completo:
```bash
./build-mobile.sh
```

Este script:
- Faz build da aplicação web
- Gera os ícones necessários
- Sincroniza com Capacitor
- Prepara para Android e iOS

## Recursos Implementados

### PWA Features:
- Service Worker para cache offline
- Web App Manifest
- Ícones otimizados para diferentes tamanhos
- Splash screen customizada
- Tema colors personalizadas

### Capacitor Features:
- StatusBar personalizada
- Keyboard otimizado
- SplashScreen configurada
- Push Notifications prontas
- Local Notifications

### Mobile UX:
- Interface responsiva
- Touch gestures
- Viewport otimizado
- Meta tags para iOS/Android
- Prompt de instalação inteligente

## Próximos Passos

1. **Para Production:**
   - Gerar ícones PNG nos tamanhos corretos
   - Configurar certificados de assinatura
   - Testar em dispositivos físicos

2. **Para Store Deployment:**
   - Google Play: Seguir guia em `GUIA_PUBLICACAO_PLAY_STORE.md`
   - App Store: Configurar certificados Apple Developer

3. **Para PWA:**
   - Configurar domínio HTTPS
   - Testar instalação em diferentes navegadores
   - Configurar push notifications server

O aplicativo está pronto para funcionar em todas as plataformas com experiência nativa em cada uma.