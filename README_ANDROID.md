# 📱 MontaFácil - Build Android para Play Store

## 🚀 Execução Rápida

Para gerar o arquivo AAB para a Play Store, execute:

```bash
./build-android.sh
```

## 📁 Arquivos Criados

- `capacitor.config.ts` - Configuração do Capacitor
- `build-android.sh` - Script de build automatizado
- `android-build.gradle` - Configurações do Gradle
- `gradle.properties` - Propriedades do build
- `GUIA_PUBLICACAO_PLAY_STORE.md` - Guia completo

## 🔧 Próximos Passos

1. **Execute o build:**
   ```bash
   ./build-android.sh
   ```

2. **Crie o keystore:**
   ```bash
   keytool -genkey -v -keystore android/app/keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias montafacil
   ```

3. **Configure as senhas** no arquivo `gradle.properties`

4. **Abra no Android Studio** e gere o AAB

5. **Publique na Play Store** seguindo o guia completo

## 📖 Documentação Completa

Consulte o arquivo `GUIA_PUBLICACAO_PLAY_STORE.md` para instruções detalhadas.

---

**Seu aplicativo MontaFácil está pronto para ser publicado na Play Store!**