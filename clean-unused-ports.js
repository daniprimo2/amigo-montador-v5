#!/usr/bin/env node
/**
 * Script para identificar e limpar portas não utilizadas
 * Remove configurações de porta desnecessárias para evitar conflitos
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🧹 Limpando configurações de portas não utilizadas...\n');

// Portas definidas no .replit atual
const configuredPorts = [3000, 3001, 3002, 5000, 5001, 6000, 6001, 7000, 8000, 8080, 9000, 9999];

// Função para verificar se uma porta está em uso
function isPortInUse(port) {
  try {
    // Tenta fazer conexão com a porta
    execSync(`curl -s --connect-timeout 2 http://localhost:${port}/health`, { stdio: 'ignore' });
    return true;
  } catch (error) {
    try {
      // Tenta apenas conectar na porta
      execSync(`timeout 2 bash -c "echo >/dev/tcp/localhost/${port}"`, { stdio: 'ignore' });
      return true;
    } catch (e) {
      return false;
    }
  }
}

// Identifica portas em uso
console.log('🔍 Verificando quais portas estão em uso...');
const usedPorts = [];
const unusedPorts = [];

configuredPorts.forEach(port => {
  const inUse = isPortInUse(port);
  console.log(`   Porta ${port}: ${inUse ? '🟢 EM USO' : '🔴 NÃO UTILIZADA'}`);
  
  if (inUse) {
    usedPorts.push(port);
  } else {
    unusedPorts.push(port);
  }
});

console.log(`\n📊 Resultado da análise:`);
console.log(`   Portas em uso: ${usedPorts.join(', ')}`);
console.log(`   Portas não utilizadas: ${unusedPorts.join(', ')}`);

// Verifica processos usando as portas
console.log('\n🔍 Verificando processos nas portas...');
usedPorts.forEach(port => {
  try {
    const result = execSync(`lsof -i :${port} 2>/dev/null || netstat -tlnp 2>/dev/null | grep :${port}`, { encoding: 'utf8' });
    if (result.trim()) {
      console.log(`   Porta ${port}: ${result.trim().split('\n')[0]}`);
    }
  } catch (error) {
    console.log(`   Porta ${port}: Processo não identificado`);
  }
});

// Gera configuração otimizada
console.log('\n📝 Configuração .replit otimizada:');
console.log('```toml');

if (usedPorts.length > 0) {
  usedPorts.forEach(port => {
    console.log(`[[ports]]`);
    console.log(`localPort = ${port}`);
    if (port === 5000) {
      console.log(`externalPort = 80`);
      console.log(`name = "main-app"`);
    }
    console.log('');
  });
} else {
  console.log('# Nenhuma porta em uso detectada');
  console.log('# Mantendo configuração padrão para porta 5000');
  console.log('[[ports]]');
  console.log('localPort = 5000');
  console.log('externalPort = 80');
  console.log('name = "main-app"');
}

console.log('```');

// Recomendações
console.log('\n💡 Recomendações:');
if (unusedPorts.length > 0) {
  console.log(`   • Remover ${unusedPorts.length} mapeamentos de porta desnecessários`);
  console.log(`   • Manter apenas as portas: ${usedPorts.join(', ')}`);
  console.log('   • Isso reduzirá confusão e possíveis conflitos');
}

console.log('   • Configurar externalPort = 80 para acesso web padrão');
console.log('   • Adicionar nome descritivo aos mapeamentos');

// Verifica se há conflitos potenciais
console.log('\n⚠️  Verificação de conflitos:');
const potentialConflicts = configuredPorts.filter(port => {
  // Portas comuns que podem causar conflito
  const commonPorts = [3000, 8000, 8080, 9000];
  return commonPorts.includes(port) && !usedPorts.includes(port);
});

if (potentialConflicts.length > 0) {
  console.log(`   Portas que podem causar conflito: ${potentialConflicts.join(', ')}`);
  console.log('   Recomenda-se remover essas configurações');
} else {
  console.log('   Nenhum conflito potencial detectado');
}

console.log('\n✅ Análise concluída. Configure apenas as portas necessárias no painel do Replit.');