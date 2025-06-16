# Amigo Montador - Android Play Store

## Estrutura Simplificada

Esta é a única pasta Android necessária para publicar na Play Store. Todo o processo foi simplificado para facilitar a configuração.

## Configuração Rápida

### 1. Instalar Dependências
```bash
# Instalar Java (se não tiver)
sudo apt install openjdk-11-jdk

# Verificar instalação
java -version
```

### 2. Configurar Variáveis
Edite o arquivo `.env` na raiz do projeto:
```
APP_NAME=Amigo Montador
APP_URL=https://seu-replit-app.replit.app
PACKAGE_NAME=com.amigomontador.app
```

### 3. Gerar AAB para Play Store
```bash
# Executar script de build
node android-playstore/build-aab.js

# O arquivo será gerado em:
# android-playstore/app-release.aab
```

## Arquivos Importantes

- `build-aab.js` - Script principal de build
- `MainActivity.java` - Configuração do WebView
- `AndroidManifest.xml` - Permissões e configurações
- `build.gradle` - Configuração de build do Android

## O que o Script Faz

1. Verifica se Java está instalado
2. Configura a URL do seu app Replit
3. Cria keystore para assinatura (se não existir)
4. Gera ícones automaticamente
5. Compila e assina o AAB
6. Valida o arquivo final

## Pronto para Play Store

O AAB gerado está pronto para upload direto na Google Play Console.

### Informações do App
- **Package**: com.amigomontador.app
- **Versão**: 1.0 (código 1)
- **SDK**: 22-34 (Android 5.1 a 14)
- **Tamanho**: ~5-15 KB
- **Tipo**: WebView otimizado

### Funcionalidades
- Carrega seu app web do Replit
- Suporte a câmera e arquivos
- GPS para localização
- Notificações push
- Design Material 3