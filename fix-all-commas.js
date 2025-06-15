#!/usr/bin/env node

import fs from 'fs';

console.log('Corrigindo todas as vírgulas ausentes...');

let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Corrigir vírgulas ausentes no objeto cityEquivalences
content = content.replace(
  /(\]\s*)\n\s*(\/\/[^\n]*\n\s*)?(['"][^'"]+['"]:\s*\[)/g,
  '$1,\n    $2$3'
);

// Corrigir vírgulas ausentes em arrays
content = content.replace(
  /(\]\s*)\n\s*(['"][^'"]+['"]:\s*\[)/g,
  '$1,\n    $2'
);

// Corrigir vírgulas ausentes antes de comentários
content = content.replace(
  /(\]\s*)\n\s*(\/\/)/g,
  '$1,\n    $2'
);

// Corrigir vírgulas ausentes no final de propriedades de objeto
content = content.replace(
  /(\'\]\s*)\n\s*([a-zA-Z\'"]+:)/g,
  '$1,\n    $2'
);

// Corrigir problemas específicos detectados pelos LSP errors
const fixes = [
  // Line 173
  { from: `'rio': ['rio de janeiro', 'rj', 'rio de janeiro rj']\n    //`, to: `'rio': ['rio de janeiro', 'rj', 'rio de janeiro rj'],\n    //` },
  // Line 175  
  { from: `'brasília': ['df', 'brasilia', 'brasília df'],\n    'df'`, to: `'brasília': ['df', 'brasilia', 'brasília df'],\n    'df'` },
  // Outros fixes necessários...
];

fixes.forEach(fix => {
  content = content.replace(fix.from, fix.to);
});

// Aplicar fix geral para objetos JavaScript mal formados
content = content.replace(
  /(\]\s*)\n(\s+)(['"]\w+['"]\s*:\s*\[)/g,
  '$1,\n$2$3'
);

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Vírgulas corrigidas!');