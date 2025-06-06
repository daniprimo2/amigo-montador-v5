#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fix import paths for ESM modules
function fixImportPaths(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Fix relative imports to include .js extension
  content = content.replace(/from\s+['"](\..+?)['"];?/g, (match, importPath) => {
    if (!importPath.endsWith('.js') && !importPath.includes('?')) {
      return match.replace(importPath, importPath + '.js');
    }
    return match;
  });
  
  // Fix import.meta.dirname for compatibility
  content = content.replace(/import\.meta\.dirname/g, '__dirname');
  
  // Add __dirname definition at the top
  if (content.includes('__dirname') && !content.includes('const __dirname =')) {
    const imports = content.match(/^import.*$/gm) || [];
    const lastImportIndex = content.lastIndexOf(imports[imports.length - 1] || '') + (imports[imports.length - 1]?.length || 0);
    const beforeImports = content.slice(0, lastImportIndex);
    const afterImports = content.slice(lastImportIndex);
    
    const dirnameDefinition = `
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
`;
    
    content = beforeImports + dirnameDefinition + afterImports;
  }
  
  fs.writeFileSync(filePath, content);
}

// Process all JS files in dist directory
function processDistFiles(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDistFiles(filePath);
    } else if (file.endsWith('.js')) {
      console.log(`Processing: ${filePath}`);
      fixImportPaths(filePath);
    }
  });
}

// Ensure dist directory exists
const distDir = path.join(__dirname, 'dist');
if (fs.existsSync(distDir)) {
  processDistFiles(distDir);
  console.log('✅ Build post-processing completed successfully');
} else {
  console.log('❌ Dist directory not found');
  process.exit(1);
}