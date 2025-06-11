// Script para gerar ícones do app em diferentes tamanhos
// Execute com: node android-app-icons/icon-generator.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG do ícone do MontaFácil
const iconSVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo circular -->
  <circle cx="256" cy="256" r="240" fill="#2563eb" stroke="#1d4ed8" stroke-width="8"/>
  
  <!-- Ferramenta (chave de fenda) -->
  <rect x="220" y="120" width="72" height="8" rx="4" fill="#ffffff" transform="rotate(45 256 256)"/>
  <rect x="220" y="120" width="8" height="72" rx="4" fill="#ffffff" transform="rotate(45 256 256)"/>
  
  <!-- Martelo -->
  <rect x="180" y="200" width="120" height="16" rx="8" fill="#fbbf24"/>
  <rect x="240" y="160" width="32" height="80" rx="16" fill="#f59e0b"/>
  
  <!-- Móvel (representando montagem) -->
  <rect x="320" y="280" width="80" height="60" rx="8" fill="#374151" stroke="#1f2937" stroke-width="2"/>
  <rect x="340" y="300" width="40" height="20" rx="4" fill="#6b7280"/>
  
  <!-- Pessoa/montador (ícone simplificado) -->
  <circle cx="160" cy="320" r="24" fill="#fbbf24"/>
  <rect x="140" y="350" width="40" height="60" rx="20" fill="#374151"/>
  <rect x="135" y="360" width="20" height="40" rx="10" fill="#f59e0b"/>
  <rect x="165" y="360" width="20" height="40" rx="10" fill="#f59e0b"/>
  
  <!-- Texto MF (MontaFácil) -->
  <text x="256" y="420" font-family="Arial, sans-serif" font-size="48" font-weight="bold" text-anchor="middle" fill="#ffffff">MF</text>
</svg>`;

// Criar diretório se não existir
const iconDir = path.join(__dirname);
if (!fs.existsSync(iconDir)) {
  fs.mkdirSync(iconDir, { recursive: true });
}

// Salvar SVG
fs.writeFileSync(path.join(iconDir, 'icon.svg'), iconSVG);

console.log('✅ Ícone SVG gerado em: android-app-icons/icon.svg');
console.log('');
console.log('📋 PRÓXIMOS PASSOS:');
console.log('1. Instale um conversor SVG para PNG (ex: Inkscape, GIMP)');
console.log('2. Converta o icon.svg para PNG nos seguintes tamanhos:');
console.log('   - 512x512px (para Play Store)');
console.log('   - 192x192px (xxxhdpi)');
console.log('   - 144x144px (xxhdpi)');
console.log('   - 96x96px (xhdpi)');
console.log('   - 72x72px (hdpi)');
console.log('   - 48x48px (mdpi)');
console.log('');
console.log('3. Ou use um serviço online como:');
console.log('   - https://romannurik.github.io/AndroidAssetStudio/');
console.log('   - https://www.appicon.co/');
console.log('');
console.log('4. Coloque os ícones na pasta android/app/src/main/res/');