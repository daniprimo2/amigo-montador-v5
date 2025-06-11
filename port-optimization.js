#!/usr/bin/env node
/**
 * Port Configuration Optimization Script
 * Validates and reports on port configuration issues
 */

import fs from 'fs';
import { execSync } from 'child_process';

console.log('🔧 Analisando configuração de portas...\n');

// Check if server is running on correct port
function checkServerStatus() {
  try {
    const response = execSync('curl -s http://localhost:5000/health', { encoding: 'utf8' });
    const health = JSON.parse(response);
    console.log('✅ Servidor rodando corretamente na porta 5000');
    console.log(`   Timestamp: ${health.timestamp}`);
    console.log(`   Status: ${health.status}`);
    return true;
  } catch (error) {
    console.log('❌ Servidor não está respondendo na porta 5000');
    return false;
  }
}

// Validate server configuration
function validateServerConfig() {
  if (!fs.existsSync('server/index.ts')) {
    console.log('❌ Arquivo server/index.ts não encontrado');
    return false;
  }

  const serverContent = fs.readFileSync('server/index.ts', 'utf8');
  
  const checks = [
    {
      name: 'Uso da variável PORT',
      test: serverContent.includes('process.env.PORT'),
      status: serverContent.includes('process.env.PORT') ? '✅' : '❌'
    },
    {
      name: 'Porta padrão 5000',
      test: serverContent.includes("'5000'"),
      status: serverContent.includes("'5000'") ? '✅' : '❌'
    },
    {
      name: 'Binding para 0.0.0.0',
      test: serverContent.includes('0.0.0.0'),
      status: serverContent.includes('0.0.0.0') ? '✅' : '❌'
    },
    {
      name: 'Health check endpoint',
      test: serverContent.includes('/health'),
      status: serverContent.includes('/health') ? '✅' : '❌'
    }
  ];

  console.log('\n📋 Configuração do Servidor:');
  checks.forEach(check => {
    console.log(`${check.status} ${check.name}`);
  });

  return checks.every(check => check.test);
}

// Check workflow configuration
function validateWorkflowConfig() {
  if (!fs.existsSync('.replit')) {
    console.log('❌ Arquivo .replit não encontrado');
    return false;
  }

  const replitContent = fs.readFileSync('.replit', 'utf8');
  
  console.log('\n📋 Configuração do Workflow:');
  console.log(replitContent.includes('waitForPort = 5000') ? '✅' : '❌', 'waitForPort configurado para 5000');
  console.log(replitContent.includes('localPort = 5000') ? '✅' : '❌', 'localPort 5000 mapeado');
  
  // Count total port mappings
  const portMappings = (replitContent.match(/localPort = \d+/g) || []).length;
  console.log(`📊 Total de mapeamentos de porta: ${portMappings}`);
  
  if (portMappings > 5) {
    console.log('⚠️  Muitos mapeamentos de porta podem causar confusão');
    console.log('   Recomendação: manter apenas porta 5000 ativa');
  }

  return true;
}

// Main execution
async function main() {
  const serverRunning = checkServerStatus();
  const serverConfigValid = validateServerConfig();
  const workflowConfigValid = validateWorkflowConfig();

  console.log('\n📊 Resumo da Análise:');
  console.log(serverRunning ? '✅' : '❌', 'Servidor ativo');
  console.log(serverConfigValid ? '✅' : '❌', 'Configuração do servidor');
  console.log(workflowConfigValid ? '✅' : '❌', 'Configuração do workflow');

  if (serverRunning && serverConfigValid && workflowConfigValid) {
    console.log('\n🎉 Configuração de portas otimizada e funcionando corretamente!');
    console.log('💡 Única melhoria sugerida: simplificar mapeamentos de porta no .replit');
  } else {
    console.log('\n⚠️  Alguns problemas foram identificados e precisam ser corrigidos');
  }
}

main().catch(console.error);