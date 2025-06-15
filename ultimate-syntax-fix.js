#!/usr/bin/env node

import fs from 'fs';

console.log('Aplicando correção definitiva de sintaxe...');

let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Corrigir todos os problemas de sintaxe identificados
content = content
  // Corrigir linhas 314-316 - normalizedEquiv1 e normalizedEquiv2
  .replace(/const normalizedEquiv1[^;]*;/g, 'const normalizedEquiv1: string[] = equivalents1.map((eq: string) => normalizeCityName(eq));')
  .replace(/const normalizedEquiv2[^;]*;/g, 'const normalizedEquiv2: string[] = equivalents2.map((eq: string) => normalizeCityName(eq));')
  .replace(/return normalizedEquiv1[^;]*;/g, 'return normalizedEquiv1.some((eq: string) => normalizedEquiv2.includes(eq));')
  
  // Corrigir linha 644 - argumento de mutação
  .replace(/mutationFn:\s*async[^{]*{[^}]*},\s*onSuccess/g, 'mutationFn: async (serviceId: number) => {\n      const response = await fetch(`/api/services/${serviceId}/apply`, {\n        method: "POST",\n        headers: { "Content-Type": "application/json" }\n      });\n      return response.json();\n    },\n    onSuccess')
  
  // Corrigir linhas 693, 704, 706, 708 - vírgulas em objetos de mutação
  .replace(/(\}\s*=\s*useMutation\s*\(\s*\{[^}]*)\s*,\s*(\})/g, '$1$2')
  .replace(/onError:\s*\([^)]*\)\s*=>\s*\{[^}]*\}\s*,\s*(\})/g, 'onError: (error) => {\n      console.error("Erro:", error);\n      toast({\n        title: "Erro",\n        description: "Falha na operação",\n        variant: "destructive"\n      });\n    }\n  $1');

// Verificar e corrigir estrutura de funções
const lines = content.split('\n');
const fixedLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];
  
  // Corrigir vírgulas órfãs em objetos
  if (line.includes('},') && lines[i + 1] && lines[i + 1].trim() === '') {
    line = line.replace(/,\s*$/, '');
  }
  
  // Garantir fechamento correto de objetos
  if (line.includes('onError:') && !line.includes('}')) {
    // Buscar fechamento na próxima linha
    let j = i + 1;
    while (j < lines.length && !lines[j].includes('}')) {
      j++;
    }
    if (j < lines.length) {
      lines[j] = lines[j].replace(/,\s*}/, '\n    }');
    }
  }
  
  fixedLines.push(line);
}

content = fixedLines.join('\n');

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Correção definitiva de sintaxe aplicada!');