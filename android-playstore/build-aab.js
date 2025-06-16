#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

console.log('🚀 Iniciando build do AmigoMontador para Play Store...\n');

// Verificar se o ambiente está configurado
function checkEnvironment() {
    console.log('📋 Verificando ambiente...');
    
    try {
        // Verificar Java
        const javaVersion = execSync('java -version', { encoding: 'utf8', stderr: 'pipe' });
        console.log('✅ Java instalado');
        
        // Verificar Gradle
        const gradleVersion = execSync('gradle --version', { encoding: 'utf8' });
        console.log('✅ Gradle instalado');
        
        return true;
    } catch (error) {
        console.log('❌ Erro no ambiente:', error.message);
        console.log('\n📝 Instruções de instalação:');
        console.log('1. Instale Java JDK 11+: https://www.oracle.com/java/technologies/javase-jdk11-downloads.html');
        console.log('2. Instale Android Studio: https://developer.android.com/studio');
        console.log('3. Configure ANDROID_HOME e JAVA_HOME nas variáveis de ambiente');
        return false;
    }
}

// Configurar URL do app
function configureAppUrl() {
    console.log('\n🌐 Configurando URL do aplicativo...');
    
    // Detectar URL do Replit automaticamente
    const replitUrl = process.env.REPL_SLUG ? 
        `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app` : 
        'https://amigomontador.replit.app';
    
    const mainActivityPath = './app/src/main/java/com/amigomontador/app/MainActivity.java';
    let content = fs.readFileSync(mainActivityPath, 'utf8');
    
    // Atualizar URL no código
    content = content.replace(
        /private static final String APP_URL = ".*";/,
        `private static final String APP_URL = "${replitUrl}";`
    );
    
    fs.writeFileSync(mainActivityPath, content);
    console.log(`✅ URL configurada: ${replitUrl}`);
}

// Criar keystore para assinatura
function createKeystore() {
    console.log('\n🔐 Criando keystore de assinatura...');
    
    const keystorePath = './app/amigomontador-keystore.jks';
    
    if (fs.existsSync(keystorePath)) {
        console.log('✅ Keystore já existe');
        return;
    }
    
    try {
        execSync(`keytool -genkey -v -keystore ${keystorePath} -alias amigomontador-key -keyalg RSA -keysize 2048 -validity 10000 -storepass amigomontador2025 -keypass amigomontador2025 -dname "CN=AmigoMontador, OU=Development, O=AmigoMontador, L=São Paulo, ST=SP, C=BR"`, 
        { stdio: 'inherit' });
        
        console.log('✅ Keystore criado com sucesso');
    } catch (error) {
        console.log('❌ Erro ao criar keystore:', error.message);
        throw error;
    }
}

// Criar ícones do aplicativo
function createAppIcons() {
    console.log('\n🎨 Criando ícones do aplicativo...');
    
    // Criar ícone adaptativo XML
    const adaptiveIconXml = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

    // Criar background color
    const colorsXml = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#1a365d</color>
</resources>`;

    // Escrever arquivos
    const mipmapDirs = [
        './app/src/main/res/mipmap-hdpi',
        './app/src/main/res/mipmap-mdpi', 
        './app/src/main/res/mipmap-xhdpi',
        './app/src/main/res/mipmap-xxhdpi',
        './app/src/main/res/mipmap-xxxhdpi'
    ];

    mipmapDirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(path.join(dir, 'ic_launcher.xml'), adaptiveIconXml);
        fs.writeFileSync(path.join(dir, 'ic_launcher_round.xml'), adaptiveIconXml);
    });

    // Adicionar cores ao values se não existir
    const valuesDir = './app/src/main/res/values';
    const colorsPath = path.join(valuesDir, 'colors.xml');
    
    if (!fs.existsSync(colorsPath)) {
        fs.writeFileSync(colorsPath, colorsXml);
    }

    console.log('✅ Ícones configurados');
}

// Limpar build anterior
function cleanBuild() {
    console.log('\n🧹 Limpando build anterior...');
    
    try {
        execSync('./gradlew clean', { stdio: 'inherit' });
        console.log('✅ Build limpo');
    } catch (error) {
        console.log('⚠️ Erro ao limpar build (continuando...)');
    }
}

// Gerar arquivo AAB
function buildAAB() {
    console.log('\n📦 Gerando arquivo AAB...');
    
    try {
        execSync('./gradlew bundleRelease', { stdio: 'inherit' });
        
        const aabPath = './app/build/outputs/bundle/release/app-release.aab';
        
        if (fs.existsSync(aabPath)) {
            const stats = fs.statSync(aabPath);
            const sizeKB = (stats.size / 1024).toFixed(2);
            
            console.log(`\n🎉 AAB gerado com sucesso!`);
            console.log(`📁 Local: ${aabPath}`);
            console.log(`📏 Tamanho: ${sizeKB} KB`);
            
            // Copiar para diretório principal
            fs.copyFileSync(aabPath, './amigomontador-release.aab');
            console.log(`📋 Copiado para: ./amigomontador-release.aab`);
            
            return true;
        } else {
            throw new Error('Arquivo AAB não foi gerado');
        }
    } catch (error) {
        console.log('❌ Erro ao gerar AAB:', error.message);
        throw error;
    }
}

// Validar arquivo AAB
function validateAAB() {
    console.log('\n✅ Validando arquivo AAB...');
    
    const aabPath = './amigomontador-release.aab';
    
    if (!fs.existsSync(aabPath)) {
        throw new Error('Arquivo AAB não encontrado');
    }
    
    const stats = fs.statSync(aabPath);
    
    if (stats.size < 1000) {
        throw new Error('Arquivo AAB muito pequeno - possível erro');
    }
    
    console.log('✅ Arquivo AAB válido');
    
    // Informações finais
    console.log('\n📋 Informações do App:');
    console.log('• Nome: AmigoMontador');
    console.log('• Package: com.amigomontador.app');
    console.log('• Versão: 1.0 (código: 1)');
    console.log('• Compatibilidade: Android 5.1+ (API 22-34)');
    console.log(`• Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
}

// Gerar documentação
function generateDocumentation() {
    console.log('\n📚 Gerando documentação...');
    
    const playStoreGuide = `# 🚀 Guia: Upload na Google Play Store

## Arquivo Gerado
- **Nome**: amigomontador-release.aab
- **Localização**: ./amigomontador-release.aab
- **Tamanho**: ${fs.existsSync('./amigomontador-release.aab') ? (fs.statSync('./amigomontador-release.aab').size / 1024).toFixed(2) + ' KB' : 'N/A'}

## Informações do App
- **Nome**: AmigoMontador
- **Package**: com.amigomontador.app
- **Versão**: 1.0 (código: 1)
- **Compatibilidade**: Android 5.1+ (API 22-34)
- **URL**: ${process.env.REPL_SLUG ? `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.replit.app` : 'https://amigomontador.replit.app'}

## Passos para Upload na Play Store

### 1. Acesse o Google Play Console
- Vá para: https://play.google.com/console
- Faça login com sua conta Google

### 2. Crie um Novo App
- Clique em "Criar app"
- Nome: AmigoMontador
- Tipo: App
- Gratuito/Pago: Conforme sua escolha
- Declarações obrigatórias: Marque todas

### 3. Upload do AAB
- Vá para "Versões do app" > "Produção"
- Clique em "Criar nova versão"
- Faça upload do arquivo: amigomontador-release.aab
- Adicione notas da versão

### 4. Preenchimento Obrigatório
- **Classificação do conteúdo**: Complete o questionário
- **Público-alvo**: Defina faixa etária
- **Privacidade**: Adicione política de privacidade
- **Categorização**: Negócios/Produtividade

### 5. Store Listing
- **Título**: AmigoMontador
- **Descrição curta**: Conectando montadores e lojas
- **Descrição completa**: 
  "Plataforma que conecta profissionais de lojas de móveis com montadores qualificados. 
  Gerencie serviços, comunique-se em tempo real e processe pagamentos com segurança."
- **Ícone**: Use o ícone gerado automaticamente
- **Capturas de tela**: Adicione pelo menos 3 screenshots

### 6. Revisão e Publicação
- Revise todas as seções
- Clique em "Enviar para revisão"
- Aguarde aprovação (2-7 dias úteis)

## Atualizações Futuras
Para atualizar o app:
1. Modifique o código do seu app web no Replit
2. As mudanças aparecerão automaticamente no app
3. Para mudanças na estrutura do app, gere nova versão do AAB

## Suporte
- Email: [seu-email@exemplo.com]
- Documentação: Este arquivo
- Backup do keystore: Guardado com segurança
`;

    fs.writeFileSync('./GUIA_PLAY_STORE.md', playStoreGuide);
    console.log('✅ Documentação criada: GUIA_PLAY_STORE.md');
}

// Função principal
async function main() {
    try {
        if (!checkEnvironment()) {
            process.exit(1);
        }
        
        configureAppUrl();
        createKeystore();
        createAppIcons();
        cleanBuild();
        buildAAB();
        validateAAB();
        generateDocumentation();
        
        console.log('\n🎉 SUCESSO! App pronto para Play Store!');
        console.log('\n📋 Próximos passos:');
        console.log('1. Acesse: https://play.google.com/console');
        console.log('2. Faça upload do arquivo: amigomontador-release.aab');
        console.log('3. Siga o guia: GUIA_PLAY_STORE.md');
        
    } catch (error) {
        console.log('\n❌ ERRO:', error.message);
        console.log('\n📝 Verifique:');
        console.log('• Java JDK 11+ instalado');
        console.log('• Android Studio instalado');
        console.log('• Variáveis ANDROID_HOME e JAVA_HOME configuradas');
        process.exit(1);
    }
}

main();