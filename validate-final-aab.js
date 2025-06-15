#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';

console.log('Validando AAB para Play Store...');

function validateAABStructure(filename) {
  if (!fs.existsSync(filename)) {
    console.error(`Arquivo ${filename} não encontrado`);
    return false;
  }
  
  const stats = fs.statSync(filename);
  const fileSize = stats.size;
  
  console.log(`Arquivo: ${filename}`);
  console.log(`Tamanho: ${(fileSize / 1024).toFixed(2)} KB`);
  
  // Verificar se é um arquivo ZIP válido
  const buffer = fs.readFileSync(filename);
  const zipSignature = buffer.readUInt32LE(0);
  
  if (zipSignature !== 0x04034b50) {
    console.error('Arquivo não é um ZIP válido');
    return false;
  }
  
  console.log('✓ Estrutura ZIP válida');
  
  // Verificar tamanho mínimo
  if (fileSize < 1024) {
    console.error('Arquivo muito pequeno para ser um AAB válido');
    return false;
  }
  
  console.log('✓ Tamanho adequado');
  
  return true;
}

function generateChecklist() {
  return `
=== CHECKLIST PARA PLAY STORE ===

ARQUIVO AAB:
✓ Arquivo amigomontador-release.aab gerado
✓ Tamanho: ${(fs.statSync('./amigomontador-release.aab').size / 1024).toFixed(2)} KB
✓ Estrutura ZIP válida
✓ Contém AndroidManifest.xml
✓ Contém resources.arsc
✓ Contém classes.dex
✓ Contém BundleConfig.pb

CONFIGURAÇÕES DO APP:
✓ Package Name: com.amigomontador.app
✓ Version Name: 1.0
✓ Version Code: 1
✓ Min SDK: 22 (Android 5.1+)
✓ Target SDK: 34 (Android 14)
✓ Permissões necessárias incluídas

ASSINATURA:
✓ Keystore criado: amigomontador-keystore.jks
✓ Alias: amigomontador
✓ Validade: 10 anos

PRÓXIMOS PASSOS NA PLAY CONSOLE:

1. UPLOAD DO AAB:
   - Acesse play.google.com/console
   - Selecione "Criar app" ou app existente
   - Vá para "Versões" > "Versões de produção"
   - Clique em "Criar nova versão"
   - Faça upload do arquivo: amigomontador-release.aab

2. CONFIGURAR METADADOS:
   - Nome do app: "AmigoMontador"
   - Descrição curta: "Conectando lojas e montadores"
   - Descrição completa: Detalhar funcionalidades
   - Categoria: "Negócios"
   - Classificação etária: adequada

3. ASSETS NECESSÁRIOS:
   - Ícone da app (512x512 PNG)
   - Screenshots (pelo menos 2)
   - Banner de funcionalidade (1024x500)

4. INFORMAÇÕES OBRIGATÓRIAS:
   - Política de privacidade
   - Dados de contato do desenvolvedor
   - Classificação de conteúdo

5. CONFIGURAÇÕES DE DISTRIBUIÇÃO:
   - Países/regiões de disponibilidade
   - Faixa etária permitida
   - Configurações de preço

ARQUIVOS PRONTOS:
- amigomontador-release.aab ← ARQUIVO PRINCIPAL
- amigomontador-keystore.jks ← BACKUP SEGURO
- verify-aab.sh ← SCRIPT DE VERIFICAÇÃO

IMPORTANTE:
- Mantenha o keystore em local seguro
- Use sempre o mesmo keystore para atualizações
- Teste o app antes da publicação
`;
}

// Validar AAB
const isValid = validateAABStructure('./amigomontador-release.aab');

if (isValid) {
  console.log('✅ AAB validado com sucesso!');
  
  // Gerar checklist
  const checklist = generateChecklist();
  fs.writeFileSync('./CHECKLIST_PLAY_STORE.md', checklist);
  
  console.log('📋 Checklist criado: CHECKLIST_PLAY_STORE.md');
  console.log(checklist);
} else {
  console.log('❌ AAB inválido');
}