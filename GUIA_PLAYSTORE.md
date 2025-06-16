# 📱 Guia Simples - Play Store

## Como Publicar seu App

### 1. Preparar o Ambiente
```bash
# Instalar Java (só uma vez)
sudo apt install openjdk-11-jdk

# Verificar se instalou
java -version
```

### 2. Configurar o App
Edite o arquivo `configurar-playstore.js` na linha 4:
```javascript
const APP_URL = 'https://seu-app.replit.app';  // Sua URL do Replit
```

### 3. Gerar o Arquivo para Play Store
```bash
# Executar uma vez
node configurar-playstore.js
```

O arquivo AAB será criado automaticamente.

### 4. Publicar na Play Store

1. **Acesse**: [play.google.com/console](https://play.google.com/console)
2. **Clique**: "Criar app"
3. **Preencha**:
   - Nome: Seu App
   - Tipo: App
   - Gratuito ou Pago: Conforme preferir
4. **Upload**: Faça upload do arquivo `app-playstore.aab`
5. **Configure**: Preencha descrição, ícones, capturas de tela
6. **Publique**: Envie para revisão

## Estrutura Final

```
projeto/
├── gerar-playstore.js    ← Script principal
├── app-playstore.aab     ← Arquivo para Play Store (gerado)
├── android/              ← Pasta Android (criada automaticamente)
└── GUIA_PLAYSTORE.md     ← Este guia
```

## Vantagens da Solução

- **Simples**: Apenas 1 arquivo para configurar
- **Rápido**: 2 minutos para gerar o app
- **Atualizado**: Mudanças no Replit aparecem automaticamente no app
- **Completo**: WebView com câmera, GPS e arquivos

## Dúvidas Comuns

**P: Preciso reinstalar algo a cada uso?**
R: Não, só instala Java uma vez.

**P: Como atualizar o app?**
R: Apenas mude seu código no Replit. O app atualiza automaticamente.

**P: O app funciona offline?**
R: Não, precisa de internet para carregar do Replit.

**P: Posso mudar a URL depois?**
R: Sim, edite o arquivo e gere novamente.

## Próximos Passos

1. Configurar `gerar-playstore.js`
2. Executar `node gerar-playstore.js`
3. Fazer upload na Play Store
4. Aguardar aprovação (2-7 dias)

Pronto! Seu app estará na Play Store.