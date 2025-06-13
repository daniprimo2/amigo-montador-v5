# 🔐 Chave de Assinatura para Google Play Store

## Arquivos Criados

### 1. Chave de Assinatura (Keystore)
- **Arquivo**: `amigomontador-keystore.jks`
- **Localização**: Raiz do projeto
- **Tamanho**: 2.79 KB

### 2. Informações da Chave
- **Alias**: amigomontador
- **Senha do Keystore**: amigomontador2024
- **Senha da Chave**: amigomontador2024
- **Algoritmo**: RSA 2048 bits
- **Validade**: 10.000 dias (aproximadamente 27 anos)

### 3. Dados do Certificado
- **CN**: AmigoMontador
- **OU**: Development
- **O**: AmigoMontador App
- **L**: Sao Paulo
- **ST**: SP
- **C**: BR

## Como Usar na Play Store

### Primeira Publicação
1. **Baixe os arquivos**:
   - `amigomontador-release.aab` (arquivo do aplicativo)
   - `amigomontador-keystore.jks` (chave de assinatura)

2. **No Google Play Console**:
   - Crie um novo aplicativo
   - Faça upload do arquivo AAB
   - Configure a assinatura do aplicativo

### Configuração de Assinatura

#### Opção 1: Play App Signing (Recomendado)
- Deixe o Google gerenciar a chave de assinatura
- Use sua chave apenas para upload
- Mais seguro e conveniente

#### Opção 2: Assinatura Manual
- Use o arquivo `amigomontador-keystore.jks`
- Mantenha a chave segura
- Você gerencia a assinatura

## Comandos para Verificação

### Verificar informações da chave:
```bash
keytool -list -v -keystore amigomontador-keystore.jks -alias amigomontador
```

### Assinar AAB manualmente (se necessário):
```bash
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 -keystore amigomontador-keystore.jks amigomontador-release.aab amigomontador
```

## Segurança da Chave

### IMPORTANTE - Guarde com Segurança:
- Faça backup da chave `amigomontador-keystore.jks`
- Anote as senhas em local seguro
- Se perder a chave, não poderá atualizar o aplicativo
- Considere usar um gerenciador de senhas

### Dados para Backup:
```
Arquivo: amigomontador-keystore.jks
Alias: amigomontador
Senha do Keystore: amigomontador2024
Senha da Chave: amigomontador2024
```

## Próximos Passos

1. **Baixar arquivos necessários**:
   - amigomontador-release.aab
   - amigomontador-keystore.jks

2. **Acessar Google Play Console**:
   - https://play.google.com/console

3. **Criar aplicativo** com as informações:
   - Nome: AmigoMontador
   - Package: com.amigomontador.app
   - Categoria: Produtividade

4. **Fazer upload do AAB** e configurar assinatura

5. **Completar informações obrigatórias** para publicação

---

**Seus arquivos estão prontos para publicação na Google Play Store!**