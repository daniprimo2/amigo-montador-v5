#!/usr/bin/env node

import fs from 'fs';

console.log('Removendo declarações duplicadas...');

let content = fs.readFileSync('client/src/components/dashboard/assembler-dashboard.tsx', 'utf8');

// Remover todas as declarações duplicadas após useMandatoryRatings
const lines = content.split('\n');
const cleanedLines = [];
let skipUntilCityEquivalences = false;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  // Começar a pular após useMandatoryRatings
  if (line.includes('} = useMandatoryRatings();')) {
    cleanedLines.push(line);
    skipUntilCityEquivalences = true;
    continue;
  }
  
  // Parar de pular quando encontrar cityEquivalences
  if (line.includes('// Mapeamento de equivalências de cidades')) {
    skipUntilCityEquivalences = false;
  }
  
  // Pular declarações duplicadas
  if (skipUntilCityEquivalences && (
    line.includes('const { user }') ||
    line.includes('const { toast }') ||
    line.includes('const queryClient') ||
    line.includes('const [searchTerm') ||
    line.includes('const [selectedState') ||
    line.includes('const [maxDistance') ||
    line.includes('const [isStateDropdownOpen') ||
    line.includes('const [isDistanceFilterOpen') ||
    line.includes('const [dashboardSection') ||
    line.includes('const [activeTab') ||
    line.includes('const [isProfileDialogOpen') ||
    line.includes('const [isSkillsWizardOpen') ||
    line.includes('const [selectedServiceFor') ||
    line.includes('const { lastMessage }') ||
    line.includes('const { data: rawServices') ||
    line.includes('const { data: activeServices') ||
    line.includes('const { data: assemblerProfile') ||
    line.includes('pendingRatings,') ||
    line.includes('currentRating:') ||
    line.includes('isRatingDialogOpen:') ||
    line.includes('closeMandatoryRating')
  )) {
    continue; // Pular linha duplicada
  }
  
  cleanedLines.push(line);
}

content = cleanedLines.join('\n');

// Corrigir vírgulas ausentes em objetos
content = content
  .replace(/(\]\s*)\n(\s*)(['"]\w)/g, '$1,\n$2$3')
  .replace(/(\'\]\s*)\n(\s*)([a-zA-Z\'"]+:)/g, '$1,\n$2$3');

fs.writeFileSync('client/src/components/dashboard/assembler-dashboard.tsx', content);

console.log('Declarações duplicadas removidas!');