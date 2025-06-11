# ✅ Checklist - Publicação Play Store
## AmigoMontador

## 📋 Verificação Antes de Publicar

### Arquivos Criados
- [x] `capacitor.config.ts` - Configuração do Capacitor
- [x] `build-android.sh` - Script de build principal  
- [x] `build-playstore.sh` - Script completo para produção
- [x] `android-build.gradle` - Configurações do Gradle
- [x] `gradle.properties` - Propriedades do build
- [x] `android-app-icons/icon.svg` - Ícone do aplicativo
- [x] `GUIA_PUBLICACAO_PLAY_STORE.md` - Guia completo
- [x] `README_ANDROID.md` - Instruções rápidas

### Passos Técnicos
- [ ] Executar `./build-playstore.sh`
- [ ] Criar keystore com senha segura
- [ ] Configurar senhas no `gradle.properties`
- [ ] Instalar Android Studio
- [ ] Abrir projeto Android no Android Studio
- [ ] Gerar AAB assinado
- [ ] Verificar tamanho do AAB (< 150MB)

### Requisitos da Play Store
- [ ] Conta Google Play Console ($25)
- [ ] Ícone 512x512px
- [ ] Screenshots (mínimo 2)
- [ ] Descrição em português
- [ ] Política de privacidade
- [ ] Classificação de conteúdo
- [ ] Categoria: Produtividade

### Informações do App
- **Nome:** AmigoMontador
- **ID:** com.amigomontador.app
- **Versão:** 1.0.0
- **Categoria:** Produtividade
- **Idioma:** Português (Brasil)

### Assets Necessários
- [ ] Ícone 512x512px (Play Store)
- [ ] Screenshot principal
- [ ] Screenshots adicionais
- [ ] Banner feature graphic (1024x500px)
- [ ] Descrição curta (80 caracteres)
- [ ] Descrição completa (4000 caracteres)

### Textos Sugeridos

**Título:** MontaFácil

**Descrição Curta:** 
"Conecta profissionais de lojas de móveis com montadores especializados"

**Descrição Completa:**
```
O MontaFácil é a plataforma que conecta profissionais de lojas de móveis com montadores especializados no Brasil.

Principais funcionalidades:
• Busca inteligente por montadores próximos
• Sistema de avaliações e reputação
• Chat integrado para comunicação
• Geolocalização precisa
• Gestão completa de serviços
• Pagamentos seguros

Para Lojistas:
• Publique serviços de montagem
• Encontre montadores qualificados
• Acompanhe o progresso dos trabalhos
• Avalie profissionais

Para Montadores:
• Encontre trabalhos próximos
• Gerencie sua agenda
• Receba pagamentos seguros
• Construa sua reputação

Transforme a experiência de montagem de móveis com o MontaFácil!
```

**Tags:** montagem, móveis, serviços, profissionais, brasil

### Comandos Principais

```bash
# 1. Build completo
./build-playstore.sh

# 2. Criar keystore
keytool -genkey -v -keystore android/app/keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias montafacil

# 3. Abrir no Android Studio
npx cap open android
```

### Arquivos Importantes
- `android/app/release/app-release.aab` - Arquivo para Play Store
- `android/app/keystore.jks` - Chave de assinatura (BACKUP!)
- `gradle.properties` - Configurações de build

### Contatos e Suporte
- **Email:** [SEU_EMAIL]
- **Site:** [SEU_SITE]
- **Suporte:** [EMAIL_SUPORTE]

---

**Status:** ✅ Pronto para publicação
**Última atualização:** Junho 2025