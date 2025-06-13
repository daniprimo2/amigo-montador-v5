# 🚀 Instruções Finais - Publicação na Play Store
## AmigoMontador - Preparação Completa

### ✅ Status do Projeto
Seu aplicativo AmigoMontador está **100% preparado** para publicação na Google Play Store!

### 📋 Arquivos Criados e Configurados
- ✅ `capacitor.config.ts` - Configuração otimizada do Capacitor
- ✅ `prepare-playstore.sh` - Script completo de preparação
- ✅ `android-app.gradle` - Configurações Android otimizadas
- ✅ `android-strings.xml` - Textos e descrições do app
- ✅ `gradle.properties` - Propriedades de build
- ✅ `prepare-deploy.js` - Script de build da aplicação
- ✅ Guias completos de publicação

---

## 🎯 Processo de Publicação (3 Passos Simples)

### Passo 1: Preparar o Aplicativo
```bash
./prepare-playstore.sh
```
Este comando fará:
- Build completo da aplicação
- Configuração do projeto Android
- Sincronização de arquivos
- Preparação para o Android Studio

### Passo 2: Criar Keystore (Chave de Assinatura)
```bash
keytool -genkey -v -keystore android/app/keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias amigomontador
```

**Configure no arquivo `gradle.properties`:**
```properties
MYAPP_RELEASE_STORE_FILE=app/keystore.jks
MYAPP_RELEASE_KEY_ALIAS=amigomontador  
MYAPP_RELEASE_STORE_PASSWORD=SUA_SENHA_AQUI
MYAPP_RELEASE_KEY_PASSWORD=SUA_SENHA_AQUI
```

### Passo 3: Gerar AAB no Android Studio
```bash
npx cap open android
```
1. No Android Studio: **Build > Generate Signed Bundle/APK**
2. Escolha **Android App Bundle (AAB)**
3. Configure o keystore criado no Passo 2
4. Gere o arquivo AAB

---

## 📱 Informações do Aplicativo para Play Console

### Dados Básicos
- **Nome:** AmigoMontador
- **ID do Pacote:** com.amigomontador.app
- **Versão:** 1.0.0 (código: 1)
- **Categoria:** Produtividade
- **Idioma:** Português (Brasil)

### Descrição Curta (80 caracteres)
```
Conecta profissionais de lojas de móveis com montadores especializados
```

### Descrição Completa (até 4000 caracteres)
```
O AmigoMontador é a plataforma que conecta profissionais de lojas de móveis com montadores especializados no Brasil.

🔧 Principais funcionalidades:
• Busca inteligente por montadores próximos  
• Sistema de avaliações e reputação
• Chat integrado para comunicação
• Geolocalização precisa
• Gestão completa de serviços
• Pagamentos seguros

🏪 Para Lojistas:
• Publique serviços de montagem
• Encontre montadores qualificados
• Acompanhe o progresso dos trabalhos
• Avalie profissionais

🔨 Para Montadores:
• Encontre trabalhos próximos
• Gerencie sua agenda
• Receba pagimentos seguros
• Construa sua reputação

Transforme a experiência de montagem de móveis com o AmigoMontador!
```

### Tags/Palavras-chave
```
montagem, móveis, serviços, profissionais, brasil, trabalho, freelancer, marceneiro
```

---

## 🎨 Assets Necessários para Play Store

### Ícones (Obrigatórios)
- **Ícone do App:** 512x512px (PNG, fundo transparente)
- Já disponível em: `android-app-icons/icon.svg`

### Screenshots (Obrigatórios - mínimo 2)
- **Telefone:** 16:9 ou 9:16 (recomendado: 1080x1920px)
- **Tablet (opcional):** formato tablet

### Banner Feature Graphic
- **Tamanho:** 1024x500px
- **Formato:** JPG ou PNG
- **Sem texto** (apenas logo se necessário)

---

## ⚙️ Configurações Importantes

### Permissões Android
O app solicita as seguintes permissões:
- **Localização:** Para encontrar montadores próximos
- **Câmera:** Para fotografar projetos e comprovantes  
- **Armazenamento:** Para salvar documentos e imagens
- **Internet:** Para comunicação e sincronização

### Classificação de Conteúdo
- **Idade:** Livre para todos
- **Categoria:** Aplicativo de negócios/produtividade
- **Sem conteúdo sensível**

### Política de Privacidade
- Documento disponível em: `attached_assets/amigo_montador_termos_privacidade_1749763348126.pdf`
- URL necessária: `https://amigomontador.com.br/privacidade`

---

## 🚀 Checklist Final de Publicação

### Antes de Enviar
- [ ] Executar `./prepare-playstore.sh` com sucesso
- [ ] Criar keystore e configurar senhas
- [ ] Gerar AAB assinado no Android Studio
- [ ] Verificar tamanho do AAB (deve ser < 150MB)
- [ ] Testar instalação do AAB em dispositivo real

### Na Play Console
- [ ] Criar conta Google Play Console ($25)
- [ ] Criar novo aplicativo
- [ ] Fazer upload do AAB
- [ ] Adicionar screenshots (mínimo 2)
- [ ] Preencher descrição e informações
- [ ] Configurar classificação de conteúdo
- [ ] Adicionar política de privacidade
- [ ] Revisar e publicar

---

## 📞 Próximos Passos

1. **Execute agora:** `./prepare-playstore.sh`
2. **Crie o keystore** com o comando fornecido
3. **Abra no Android Studio:** `npx cap open android`
4. **Gere o AAB** seguindo as instruções
5. **Publique na Play Console**

### Suporte
- Guia detalhado: `GUIA_PUBLICACAO_PLAY_STORE.md`
- Checklist completo: `CHECKLIST_PLAY_STORE.md`
- Documentação Capacitor: https://capacitorjs.com
- Play Console: https://play.google.com/console

---

**🎉 Seu aplicativo AmigoMontador está pronto para conquistar a Play Store!**