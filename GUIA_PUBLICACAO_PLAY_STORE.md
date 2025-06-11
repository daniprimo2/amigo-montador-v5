# 📱 Guia Completo - Publicação na Play Store
### AmigoMontador - Aplicativo Android

## 🎯 Visão Geral

Este guia te ajudará a publicar o aplicativo AmigoMontador na Google Play Store usando os arquivos gerados.

---

## 📋 Pré-requisitos

### Ferramentas Necessárias:
- ✅ **Android Studio** (versão mais recente)
- ✅ **Java JDK 11** ou superior  
- ✅ **Node.js** (já instalado)
- ✅ **Conta Google Play Console** ($25 taxa única)

### Arquivos Criados:
- `capacitor.config.ts` - Configuração do Capacitor
- `build-android.sh` - Script de build automatizado
- `android-build.gradle` - Configurações do Gradle
- `gradle.properties` - Propriedades do build

---

## 🔧 Passo 1: Build da Aplicação

### Execute o script de build:
```bash
./build-android.sh
```

Este script irá:
- Fazer build da aplicação web
- Configurar o projeto Android com Capacitor
- Preparar os arquivos para o Android Studio

---

## 🔑 Passo 2: Criar Keystore (Chave de Assinatura)

### Gere a chave de assinatura:
```bash
keytool -genkey -v -keystore android/app/keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias amigomontador
```

### Preencha as informações solicitadas:
- **Nome e sobrenome:** Seu nome ou da empresa
- **Unidade organizacional:** AmigoMontador
- **Organização:** Sua empresa
- **Cidade:** Sua cidade
- **Estado:** Seu estado  
- **Código do país:** BR
- **Senha do keystore:** Crie uma senha forte
- **Senha da chave:** Pode ser a mesma do keystore

### Configure as variáveis no arquivo `gradle.properties`:
```properties
MYAPP_RELEASE_STORE_PASSWORD=sua_senha_keystore
MYAPP_RELEASE_KEY_PASSWORD=sua_senha_chave
```

---

## 🏗️ Passo 3: Configurar Android Studio

### 1. Abrir o projeto:
- Abra o Android Studio
- Clique em "Open an existing Android Studio project"
- Navegue até a pasta `android/` do seu projeto
- Clique em "OK"

### 2. Configurar o build:
- Aguarde o Android Studio sincronizar o projeto
- Vá em **File > Project Structure**
- Verifique se o SDK está configurado corretamente

---

## 📦 Passo 4: Gerar AAB para Play Store

### 1. Build de Release:
- No Android Studio, vá em **Build > Generate Signed Bundle / APK**
- Selecione **Android App Bundle**
- Clique em **Next**

### 2. Configurar Keystore:
- **Key store path:** Selecione o arquivo `android/app/keystore.jks`
- **Key store password:** Digite a senha do keystore
- **Key alias:** amigomontador
- **Key password:** Digite a senha da chave
- Clique em **Next**

### 3. Configurações de Build:
- **Destination Folder:** Deixe o padrão
- **Build Variants:** Selecione **release**
- Marque **V1 (Jar Signature)** e **V2 (Full APK Signature)**
- Clique em **Finish**

### 4. Localizar o AAB:
O arquivo será gerado em: `android/app/release/app-release.aab`

---

## 🎨 Passo 5: Preparar Assets da Play Store

### Ícones Necessários:
- **Ícone do app:** 512x512 px (PNG)
- **Ícone adaptável:** 512x512 px (PNG, com fundo transparente)

### Screenshots Necessários:
- **Telefone:** Mínimo 2 screenshots (16:9 ou 9:16)
- **Tablet (opcional):** Screenshots em formato tablet

### Banner da Feature Graphic:
- **Tamanho:** 1024x500 px
- **Formato:** JPG ou PNG 24-bit
- **Não deve conter texto além do logo**

---

## 🚀 Passo 6: Publicar na Play Console

### 1. Acesse o Google Play Console:
- Vá para [play.google.com/console](https://play.google.com/console)
- Faça login com sua conta Google
- Pague a taxa de $25 (apenas uma vez)

### 2. Criar novo aplicativo:
- Clique em **"Criar aplicativo"**
- **Nome:** AmigoMontador
- **Idioma padrão:** Português (Brasil)
- **Tipo:** Aplicativo
- **Pago ou gratuito:** Escolha conforme seu modelo

### 3. Configurar informações básicas:

#### **Detalhes do aplicativo:**
- **Título:** AmigoMontador
- **Descrição curta:** "Conecta profissionais de lojas de móveis com montadores especializados"
- **Descrição completa:** 
```
O AmigoMontador é a plataforma que conecta profissionais de lojas de móveis com montadores especializados no Brasil. 

🔧 Principais funcionalidades:
• Busca inteligente por montadores próximos
• Sistema de avaliações e reputação
• Chat integrado para comunicação
• Geolocalização precisa
• Gestão completa de serviços
• Pagamentos seguros

👥 Para Lojistas:
• Publique serviços de montagem
• Encontre montadores qualificados
• Acompanhe o progresso dos trabalhos
• Avalie profissionais

🔨 Para Montadores:
• Encontre trabalhos próximos
• Gerencie sua agenda
• Receba pagamentos seguros
• Construa sua reputação

Transforme a experiência de montagem de móveis com o AmigoMontador!
```

#### **Categoria:** Produtividade
#### **Tags:** montagem, móveis, serviços, profissionais

### 4. Fazer upload do AAB:
- Vá para **Produção > Criar nova versão**
- Faça upload do arquivo `app-release.aab`
- Adicione as **Notas de versão:**
```
Primeira versão do AmigoMontador
• Conexão entre lojistas e montadores
• Sistema de geolocalização
• Chat integrado
• Avaliações e pagamentos seguros
```

### 5. Configurar classificação de conteúdo:
- Complete o questionário de classificação
- Para o AmigoMontador, será provavelmente **PEGI 3** ou **Livre**

### 6. Política de Privacidade:
Você precisará criar uma política de privacidade. Exemplo básico:

```
POLÍTICA DE PRIVACIDADE - AmigoMontador

Última atualização: [DATA]

1. INFORMAÇÕES COLETADAS
- Dados de localização para conectar usuários
- Informações de perfil e contato
- Dados de uso do aplicativo

2. USO DAS INFORMAÇÕES
- Conectar lojistas e montadores
- Melhorar nossos serviços
- Comunicação entre usuários

3. COMPARTILHAMENTO
- Não vendemos seus dados
- Compartilhamos apenas para prestação do serviço

4. SEGURANÇA
- Criptografia de dados sensíveis
- Servidores seguros

5. SEUS DIREITOS
- Acesso aos seus dados
- Correção de informações
- Exclusão de conta

Contato: [SEU_EMAIL]
```

### 7. Revisar e publicar:
- Revise todas as informações
- Clique em **"Revisar versão"**
- Clique em **"Iniciar implantação para produção"**

---

## ⏱️ Cronograma de Aprovação

### Primeira submissão:
- **Revisão:** 1-3 dias
- **Publicação:** Até 7 dias

### Atualizações futuras:
- **Revisão:** Algumas horas a 1 dia
- **Publicação:** Imediata após aprovação

---

## 🔄 Atualizações Futuras

### Para atualizar o app:
1. Altere o `versionCode` e `versionName` no `android/app/build.gradle`
2. Execute novamente o `build-android.sh`
3. Gere novo AAB no Android Studio
4. Faça upload na Play Console

### Exemplo de versionamento:
```gradle
versionCode 2      // Sempre incrementar
versionName "1.1.0" // Versão visível para usuários
```

---

## ❗ Problemas Comuns

### Build falha:
- Verifique se todas as dependências estão instaladas
- Limpe o cache: `./gradlew clean`
- Sincronize o projeto no Android Studio

### Keystore perdido:
- ⚠️ **NUNCA perca o keystore!** 
- Faça backup em local seguro
- Sem ele, não conseguirá atualizar o app

### Rejeição na Play Store:
- Verifique política de privacidade
- Certifique-se que não há conteúdo proibido
- Teste o app em diferentes dispositivos

---

## 📞 Suporte

### Recursos úteis:
- **Documentação Capacitor:** [capacitorjs.com](https://capacitorjs.com)
- **Play Console Help:** [support.google.com/googleplay](https://support.google.com/googleplay)
- **Android Developers:** [developer.android.com](https://developer.android.com)

---

## ✅ Checklist Final

Antes de publicar, verifique:

- [ ] App funciona corretamente
- [ ] Keystore criado e salvo com segurança  
- [ ] AAB gerado sem erros
- [ ] Screenshots de qualidade
- [ ] Descrição completa e atrativa
- [ ] Política de privacidade criada
- [ ] Classificação de conteúdo configurada
- [ ] Informações de contato atualizadas

---

**🚀 Parabéns! Seu aplicativo AmigoMontador está pronto para a Play Store!**

---

*Este guia foi criado especificamente para o projeto AmigoMontador. Para dúvidas específicas, consulte a documentação oficial de cada ferramenta.*