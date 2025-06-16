# Instalação Rápida - AmigoMontador React Native

## Problema Resolvido

O erro `@react-native/typescript-config@^0.72.0` foi corrigido removendo dependências problemáticas do package.json.

## Passos para Instalação

### 1. Limpar Cache NPM (Se Necessário)
```bash
npm cache clean --force
```

### 2. Instalar Dependências
```bash
cd react-native-app
npm install --legacy-peer-deps
```

### 3. Se ainda der erro, usar Yarn (Alternativa)
```bash
# Instalar Yarn globalmente
npm install -g yarn

# Instalar dependências com Yarn
yarn install
```

### 4. Configurar Android (Após Instalação)
```bash
# Linkar bibliotecas nativas
npx react-native link react-native-sqlite-storage
npx react-native link react-native-vector-icons
```

### 5. Executar no Emulador
```bash
# Certificar que emulador Android está rodando
npm run android
```

## Dependências que Foram Removidas

Removidas as dependências problemáticas:
- `@react-native/eslint-config`
- `@react-native/metro-config` 
- `@react-native/typescript-config`

## Arquivos de Configuração Criados

- ✅ `metro.config.js` - Configuração do Metro bundler
- ✅ `babel.config.js` - Configuração do Babel
- ✅ `tsconfig.json` - Configuração TypeScript
- ✅ `react-native.config.js` - Configuração de linking

## Se Continuar com Problemas

### Opção 1: Usar --legacy-peer-deps
```bash
npm install --legacy-peer-deps --force
```

### Opção 2: Criar .npmrc
Crie arquivo `.npmrc` na pasta react-native-app:
```
legacy-peer-deps=true
strict-ssl=false
```

### Opção 3: Usar versões específicas
Se persistir o erro, edite o package.json e rode:
```bash
npm install react-native@0.71.8 --save
npm install
```

## Próximos Passos Após Instalação

1. **Iniciar Metro**: `npx react-native start`
2. **Abrir Emulador Android** no Android Studio
3. **Executar App**: `npm run android`
4. **Gerar AAB**: `./build-aab.sh`

## Verificar Instalação

```bash
# Verificar se React Native está funcionando
npx react-native doctor

# Verificar dependências críticas
npm list react-native
npm list @react-navigation/native
```

A instalação deve funcionar agora sem erros.