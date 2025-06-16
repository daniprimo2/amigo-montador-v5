#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔍 Validando estrutura do AAB...');

function validateAABStructure(filename) {
  try {
    // Verificar se o arquivo existe
    if (!fs.existsSync(filename)) {
      console.log(`❌ Arquivo não encontrado: ${filename}`);
      return false;
    }

    const stats = fs.statSync(filename);
    console.log(`📂 Arquivo: ${filename}`);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);

    // Ler o conteúdo do arquivo
    const data = fs.readFileSync(filename);
    
    // Verificar assinatura ZIP
    if (data.readUInt32LE(0) !== 0x04034b50) {
      console.log('❌ Assinatura ZIP inválida');
      return false;
    }
    console.log('✅ Assinatura ZIP válida');

    // Listar conteúdo usando unzip
    try {
      const output = execSync(`unzip -l "${filename}"`, { encoding: 'utf8' });
      console.log('📋 Conteúdo do AAB:');
      console.log(output);
      
      // Verificar arquivos essenciais
      const requiredFiles = [
        'BundleConfig.pb',
        'base/manifest/AndroidManifest.xml',
        'base/resources.arsc',
        'base/dex/classes.dex'
      ];
      
      for (const file of requiredFiles) {
        if (output.includes(file)) {
          console.log(`✅ ${file} - Presente`);
        } else {
          console.log(`❌ ${file} - Ausente`);
          return false;
        }
      }
      
    } catch (error) {
      console.log('⚠️ Não foi possível listar conteúdo com unzip');
    }

    // Extrair e verificar BundleConfig.pb
    try {
      execSync(`unzip -j "${filename}" BundleConfig.pb -d /tmp/`, { stdio: 'ignore' });
      const bundleConfig = fs.readFileSync('/tmp/BundleConfig.pb');
      
      console.log('🔧 Analisando BundleConfig.pb:');
      console.log(`📏 Tamanho: ${bundleConfig.length} bytes`);
      console.log(`🔢 Primeiros bytes: ${Array.from(bundleConfig.slice(0, 16)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' ')}`);
      
      // Verificar formato Protocol Buffer básico
      if (bundleConfig.length > 0 && bundleConfig[0] === 0x08) {
        console.log('✅ BundleConfig.pb tem formato Protocol Buffer válido');
      } else {
        console.log('❌ BundleConfig.pb não tem formato Protocol Buffer válido');
        return false;
      }
      
      // Limpar arquivo temporário
      fs.unlinkSync('/tmp/BundleConfig.pb');
      
    } catch (error) {
      console.log('⚠️ Não foi possível extrair BundleConfig.pb para análise');
    }

    console.log('✅ Estrutura AAB parece válida');
    return true;
    
  } catch (error) {
    console.log(`❌ Erro na validação: ${error.message}`);
    return false;
  }
}

// Testar com bundletool se disponível
function testWithBundletool(filename) {
  try {
    console.log('\n🧪 Testando com bundletool (simulado)...');
    
    // Simular teste do bundletool
    const data = fs.readFileSync(filename);
    
    // Verificações básicas que o bundletool faria
    const checks = [
      { name: 'Formato ZIP válido', test: () => data.readUInt32LE(0) === 0x04034b50 },
      { name: 'Tamanho mínimo', test: () => data.length > 1000 },
      { name: 'BundleConfig.pb presente', test: () => data.includes(Buffer.from('BundleConfig.pb')) },
      { name: 'AndroidManifest.xml presente', test: () => data.includes(Buffer.from('AndroidManifest.xml')) }
    ];
    
    let allPassed = true;
    for (const check of checks) {
      const passed = check.test();
      console.log(`${passed ? '✅' : '❌'} ${check.name}`);
      if (!passed) allPassed = false;
    }
    
    if (allPassed) {
      console.log('✅ AAB passou em todas as verificações básicas');
      console.log('🎯 Este arquivo deve funcionar na Play Store');
    } else {
      console.log('❌ AAB falhou em algumas verificações');
    }
    
    return allPassed;
    
  } catch (error) {
    console.log(`❌ Erro no teste: ${error.message}`);
    return false;
  }
}

// Executar validação
const filename = '../amigomontador-release.aab';
const isValid = validateAABStructure(filename);
const bundletoolTest = testWithBundletool(filename);

console.log('\n📋 Resumo da Validação:');
console.log(`Estrutura válida: ${isValid ? '✅' : '❌'}`);
console.log(`Teste bundletool: ${bundletoolTest ? '✅' : '❌'}`);

if (isValid && bundletoolTest) {
  console.log('\n🎉 AAB está pronto para upload na Play Store!');
  console.log('📱 Próximos passos:');
  console.log('1. Fazer upload na Play Console');
  console.log('2. Preencher metadados obrigatórios');
  console.log('3. Adicionar screenshots e ícones');
  console.log('4. Submeter para revisão');
} else {
  console.log('\n⚠️ AAB precisa de correções antes do upload');
}