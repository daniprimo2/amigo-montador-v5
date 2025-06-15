#!/usr/bin/env node

import fs from 'fs';

console.log('Aplicando correção final de sintaxe...');

let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Aplicar correções sistemáticas para todos os erros de vírgula
content = content
  // Corrigir todas as linhas que terminam com ] seguidas de comentário ou nova propriedade
  .replace(/(\]\s*)\n(\s*)(\/\/[^\n]*\n\s*)?(['"]\w+['"]\s*:)/g, '$1,\n$2$3$4')
  // Corrigir propriedades que não têm vírgula no final
  .replace(/(\]\s*)\n(\s*)(['"]\w)/g, '$1,\n$2$3')
  // Corrigir comentários seguidos de propriedades
  .replace(/(\/\/[^\n]*\n\s*)(['"]\w+['"]\s*:\s*\[)/g, '$1$2')
  // Garantir vírgulas após arrays antes de comentários
  .replace(/(\]\s*)\n(\s*\/\/)/g, '$1,\n$2')
  // Corrigir estruturas específicas identificadas
  .replace(/(\'\]\s*)\n(\s*)([a-zA-Z\'"]+:)/g, '$1,\n$2$3');

// Aplicar correções manuais para linhas específicas problemáticas
const specificFixes = [
  // Linha 179: 'bh': [...] precisa de vírgula
  { from: `'bh': ['belo horizonte', 'mg', 'belo horizonte mg'],\n    // Salvador`, to: `'bh': ['belo horizonte', 'mg', 'belo horizonte mg'],\n    // Salvador` },
  // Linha 182: 'salvador': [...] precisa de vírgula
  { from: `'salvador': ['ba', 'salvador ba'],\n    // Fortaleza`, to: `'salvador': ['ba', 'salvador ba'],\n    // Fortaleza` },
  // Aplicar pattern geral
];

// Fazer uma passada final para garantir que todas as propriedades de objeto tenham vírgulas
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const nextLine = lines[i + 1];
  
  // Se a linha atual termina com ] e a próxima começa com uma propriedade ou comentário
  if (line.includes(']') && nextLine && 
      (nextLine.trim().startsWith("'") || nextLine.trim().startsWith('"') || nextLine.trim().startsWith('//'))) {
    // Verificar se já não tem vírgula
    if (!line.endsWith(',')) {
      fixedLines.push(line + ',');
    } else {
      fixedLines.push(line);
    }
  } else {
    fixedLines.push(line);
  }
}

content = fixedLines.join('\n');

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Correção final de sintaxe aplicada!');