// Script para gerar ícones do app em diferentes tamanhos
// Execute com: node android-app-icons/icon-generator.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG do ícone do Amigo Montador
const iconSVG = `<svg width="512" height="512" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
  <!-- Fundo circular azul -->
  <circle cx="256" cy="256" r="240" fill="#2563eb" stroke="#1d4ed8" stroke-width="8"/>
  
  <!-- Ferramenta principal (chave de fenda) -->
  <g transform="rotate(45 256 180)">
    <rect x="240" y="140" width="32" height="80" rx="4" fill="#ffffff"/>
    <rect x="248" y="120" width="16" height="20" rx="8" fill="#fbbf24"/>
  </g>
  
  <!-- Martelo -->
  <g transform="rotate(-30 200 240)">
    <rect x="180" y="230" width="60" height="12" rx="6" fill="#fbbf24"/>
    <rect x="235" y="220" width="20" height="32" rx="10" fill="#f59e0b"/>
  </g>
  
  <!-- Móvel sendo montado -->
  <rect x="300" y="280" width="100" height="80" rx="8" fill="#374151" stroke="#ffffff" stroke-width="3"/>
  <rect x="320" y="300" width="60" height="40" rx="4" fill="#6b7280"/>
  <circle cx="315" cy="350" r="6" fill="#ffffff"/>
  <circle cx="385" cy="350" r="6" fill="#ffffff"/>
  
  <!-- Pessoa montador -->
  <circle cx="180" cy="300" r="28" fill="#fbbf24"/>
  <rect x="160" y="330" width="40" height="70" rx="20" fill="#374151"/>
  <rect x="150" y="340" width="20" height="50" rx="10" fill="#f59e0b"/>
  <rect x="180" y="340" width="20" height="50" rx="10" fill="#f59e0b"/>
  
  <!-- Texto AM (Amigo Montador) -->
  <text x="256" y="440" font-family="Arial, sans-serif" font-size="52" font-weight="bold" text-anchor="middle" fill="#ffffff">AM</text>
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