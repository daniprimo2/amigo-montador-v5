#!/usr/bin/env node
/**
 * Script para identificar e documentar remoção de portas não utilizadas
 * Gera relatório completo e instruções específicas
 */

import { execSync } from 'child_process';
import fs from 'fs';

console.log('🧹 Analisando e documentando remoção de portas não utilizadas\n');

// Lista todas as portas configuradas
const allConfiguredPorts = [3000, 3001, 3002, 5000, 5001, 6000, 6001, 7000, 8000, 8080, 9000, 9999];

// Verifica quais portas estão sendo usadas
function checkPortUsage() {
  const results = {
    used: [],
    unused: [],
    conflicts: []
  };

  allConfiguredPorts.forEach(port => {
    try {
      // Verifica se há processo na porta
      const output = execSync(`lsof -i :${port} 2>/dev/null`, { encoding: 'utf8' });
      if (output.trim()) {
        results.used.push({
          port,
          process: output.split('\n')[1] || 'Unknown'
        });
      } else {
        results.unused.push(port);
      }
    } catch (error) {
      results.unused.push(port);
    }
  });

  return results;
}

// Verifica configuração atual do servidor
function validateServerConfiguration() {
  const serverFile = 'server/index.ts';
  if (!fs.existsSync(serverFile)) {
    return { valid: false, reason: 'server/index.ts não encontrado' };
  }

  const content = fs.readFileSync(serverFile, 'utf8');
  
  const checks = {
    hasPortEnv: content.includes('process.env.PORT'),
    hasDefaultPort: content.includes('5000'),
    hasHostBinding: content.includes('0.0.0.0'),
    hasHealthCheck: content.includes('/health')
  };

  const allValid = Object.values(checks).every(check => check);
  
  return {
    valid: allValid,
    checks,
    reason: allValid ? 'Configuração válida' : 'Problemas na configuração'
  };
}

// Gera instruções específicas para limpeza
function generateCleanupInstructions(unusedPorts) {
  return `
## Instruções Específicas para Limpeza de Portas

### Passo 1: Acesse o Painel de Portas
1. No Replit, clique no ícone de "Tools" na barra lateral
2. Selecione "Ports" na lista de ferramentas

### Passo 2: Remover Portas Específicas
Remova os seguintes mapeamentos clicando no "X" ao lado de cada porta:

${unusedPorts.map(port => `- Porta ${port} (não utilizada)`).join('\n')}

### Passo 3: Configurar Porta Principal (5000)
Para a porta 5000 que deve permanecer:
1. Clique em "Set external port" 
2. Configure como: 80
3. Adicione nome: "amigo-montador-app"

### Configuração Final Esperada:
\`\`\`
Internal Port: 5000
External Port: 80  
Name: amigo-montador-app
PID: [número do processo]
\`\`\`

### Verificação Pós-Limpeza:
Após aplicar as mudanças, verifique se:
- Apenas 1 porta está listada (5000)
- A aplicação continua acessível
- Não há erros no console
`;
}

// Execução principal
function main() {
  console.log('📊 Iniciando análise completa de portas...\n');

  // 1. Verificar uso de portas
  const portUsage = checkPortUsage();
  
  console.log('🔍 Resultado da análise:');
  console.log(`   Portas em uso: ${portUsage.used.length}`);
  console.log(`   Portas não utilizadas: ${portUsage.unused.length}`);
  
  if (portUsage.used.length > 0) {
    console.log('\n✅ Portas ativas:');
    portUsage.used.forEach(({ port, process }) => {
      console.log(`   ${port}: ${process.split(' ').slice(0, 3).join(' ')}`);
    });
  }

  if (portUsage.unused.length > 0) {
    console.log('\n🗑️  Portas para remover:');
    portUsage.unused.forEach(port => {
      console.log(`   ${port} - não utilizada`);
    });
  }

  // 2. Validar configuração do servidor
  console.log('\n🔧 Validação do servidor:');
  const serverConfig = validateServerConfiguration();
  console.log(`   Status: ${serverConfig.valid ? '✅ Válido' : '❌ Problemas'}`);
  
  if (serverConfig.checks) {
    Object.entries(serverConfig.checks).forEach(([check, passed]) => {
      const name = {
        hasPortEnv: 'Variável PORT',
        hasDefaultPort: 'Porta padrão 5000',
        hasHostBinding: 'Host binding 0.0.0.0',
        hasHealthCheck: 'Health check endpoint'
      }[check];
      console.log(`   ${passed ? '✅' : '❌'} ${name}`);
    });
  }

  // 3. Gerar arquivo de instruções
  const instructions = generateCleanupInstructions(portUsage.unused);
  fs.writeFileSync('CLEANUP_PORTS_INSTRUCTIONS.md', instructions);
  
  console.log('\n📋 Resumo Final:');
  console.log(`   Total de portas configuradas: ${allConfiguredPorts.length}`);
  console.log(`   Portas necessárias: ${portUsage.used.length}`);
  console.log(`   Portas para remover: ${portUsage.unused.length}`);
  console.log(`   Economia de configuração: ${Math.round((portUsage.unused.length / allConfiguredPorts.length) * 100)}%`);
  
  console.log('\n📄 Instruções detalhadas salvas em: CLEANUP_PORTS_INSTRUCTIONS.md');
  
  if (portUsage.unused.length > 0) {
    console.log('\n⚡ Ação Requerida:');
    console.log('   Remova as portas não utilizadas seguindo as instruções geradas');
    console.log('   Isso eliminará conflitos e otimizará a configuração');
  } else {
    console.log('\n✅ Configuração já otimizada - nenhuma ação necessária');
  }
}

main();