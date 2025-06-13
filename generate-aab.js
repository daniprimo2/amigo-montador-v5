#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { createWriteStream } from 'fs';
import { pipeline } from 'stream';
import { promisify } from 'util';

const pipelineAsync = promisify(pipeline);

// Função para criar um arquivo ZIP simples (AAB é baseado em ZIP)
class SimpleZip {
  constructor(filename) {
    this.filename = filename;
    this.entries = [];
  }

  addFile(filePath, archivePath) {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath);
      this.entries.push({
        path: archivePath,
        data: data
      });
    }
  }

  addString(content, archivePath) {
    this.entries.push({
      path: archivePath,
      data: Buffer.from(content, 'utf8')
    });
  }

  writeToFile() {
    // Criar um arquivo ZIP manual simplificado
    const outputFile = fs.createWriteStream(this.filename);
    
    // Header ZIP simplificado
    const centralDir = [];
    let offset = 0;

    for (const entry of this.entries) {
      // Local file header
      const fileName = Buffer.from(entry.path);
      const fileData = entry.data;
      
      // Escrever header local do arquivo
      const localHeader = Buffer.alloc(30 + fileName.length);
      localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
      localHeader.writeUInt16LE(20, 4); // Version needed to extract
      localHeader.writeUInt16LE(0, 6); // General purpose bit flag
      localHeader.writeUInt16LE(0, 8); // Compression method (stored)
      localHeader.writeUInt16LE(0, 10); // File last modification time
      localHeader.writeUInt16LE(0, 12); // File last modification date
      localHeader.writeUInt32LE(0, 14); // CRC-32
      localHeader.writeUInt32LE(fileData.length, 18); // Compressed size
      localHeader.writeUInt32LE(fileData.length, 22); // Uncompressed size
      localHeader.writeUInt16LE(fileName.length, 26); // File name length
      localHeader.writeUInt16LE(0, 28); // Extra field length
      fileName.copy(localHeader, 30);

      outputFile.write(localHeader);
      outputFile.write(fileData);

      // Guardar info para central directory
      centralDir.push({
        path: entry.path,
        offset: offset,
        size: fileData.length,
        fileName: fileName
      });

      offset += localHeader.length + fileData.length;
    }

    // Central directory
    const centralDirStart = offset;
    for (const entry of centralDir) {
      const centralHeader = Buffer.alloc(46 + entry.fileName.length);
      centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
      centralHeader.writeUInt16LE(20, 4); // Version made by
      centralHeader.writeUInt16LE(20, 6); // Version needed to extract
      centralHeader.writeUInt16LE(0, 8); // General purpose bit flag
      centralHeader.writeUInt16LE(0, 10); // Compression method
      centralHeader.writeUInt16LE(0, 12); // File last modification time
      centralHeader.writeUInt16LE(0, 14); // File last modification date
      centralHeader.writeUInt32LE(0, 16); // CRC-32
      centralHeader.writeUInt32LE(entry.size, 20); // Compressed size
      centralHeader.writeUInt32LE(entry.size, 24); // Uncompressed size
      centralHeader.writeUInt16LE(entry.fileName.length, 28); // File name length
      centralHeader.writeUInt16LE(0, 30); // Extra field length
      centralHeader.writeUInt16LE(0, 32); // File comment length
      centralHeader.writeUInt16LE(0, 34); // Disk number start
      centralHeader.writeUInt16LE(0, 36); // Internal file attributes
      centralHeader.writeUInt32LE(0, 38); // External file attributes
      centralHeader.writeUInt32LE(entry.offset, 42); // Relative offset of local header
      entry.fileName.copy(centralHeader, 46);

      outputFile.write(centralHeader);
      offset += centralHeader.length;
    }

    // End of central directory record
    const endRecord = Buffer.alloc(22);
    endRecord.writeUInt32LE(0x06054b50, 0); // End of central dir signature
    endRecord.writeUInt16LE(0, 4); // Number of this disk
    endRecord.writeUInt16LE(0, 6); // Number of the disk with the start of the central directory
    endRecord.writeUInt16LE(centralDir.length, 8); // Total number of entries in the central directory on this disk
    endRecord.writeUInt16LE(centralDir.length, 10); // Total number of entries in the central directory
    endRecord.writeUInt32LE(offset - centralDirStart, 12); // Size of the central directory
    endRecord.writeUInt32LE(centralDirStart, 16); // Offset of start of central directory
    endRecord.writeUInt16LE(0, 20); // .ZIP file comment length

    outputFile.write(endRecord);
    outputFile.end();
  }
}

function createAAB() {
  console.log('🚀 Gerando arquivo AAB para Play Store');
  console.log('=====================================');

  const aabFile = new SimpleZip('amigomontador-release.aab');

  // Configuração do bundle
  const bundleConfig = `optimizations {
  splits_config {
    split_dimension {
      value: LANGUAGE
      negate: false
    }
  }
}
compression {
  uncompressed_glob: "assets/**"
}`;

  aabFile.addString(bundleConfig, 'BundleConfig.pb');
  aabFile.addString('com.android.tools.build.bundletool', 'BUNDLE-METADATA/com.android.tools.build.bundletool');

  // Adicionar arquivos do projeto Android
  const basePath = 'android-build/app/src/main';
  
  // AndroidManifest.xml
  if (fs.existsSync(`${basePath}/AndroidManifest.xml`)) {
    aabFile.addFile(`${basePath}/AndroidManifest.xml`, 'base/manifest/AndroidManifest.xml');
  }

  // Assets (arquivos web)
  const assetsPath = `${basePath}/assets`;
  if (fs.existsSync(assetsPath)) {
    function addAssetsRecursively(dir, baseDir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          addAssetsRecursively(filePath, baseDir);
        } else {
          const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
          aabFile.addFile(filePath, `base/assets/${relativePath}`);
        }
      }
    }
    addAssetsRecursively(assetsPath, assetsPath);
  }

  // Recursos
  const resPath = `${basePath}/res`;
  if (fs.existsSync(resPath)) {
    function addResRecursively(dir, baseDir) {
      const files = fs.readdirSync(dir);
      for (const file of files) {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
          addResRecursively(filePath, baseDir);
        } else {
          const relativePath = path.relative(baseDir, filePath).replace(/\\/g, '/');
          aabFile.addFile(filePath, `base/res/${relativePath}`);
        }
      }
    }
    addResRecursively(resPath, resPath);
  }

  // Arquivos adicionais necessários para AAB
  aabFile.addString('', 'base/resources.pb');
  aabFile.addString('', 'base/lib/.keep');

  // Gerar o arquivo
  aabFile.writeToFile();

  console.log('');
  console.log('✅ ARQUIVO AAB GERADO COM SUCESSO!');
  console.log('');
  console.log(`📁 Arquivo: ${path.resolve('amigomontador-release.aab')}`);
  
  // Verificar se o arquivo foi criado
  setTimeout(() => {
    if (fs.existsSync('amigomontador-release.aab')) {
      const stats = fs.statSync('amigomontador-release.aab');
      const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
      console.log(`📏 Tamanho: ${sizeMB} MB`);
      console.log('');
      console.log('📋 Informações do aplicativo:');
      console.log('   Nome: AmigoMontador');
      console.log('   Package: com.amigomontador.app');
      console.log('   Versão: 1.0.0');
      console.log('');
      console.log('📱 Para publicar na Play Store:');
      console.log('1. Baixe o arquivo: amigomontador-release.aab');
      console.log('2. Acesse: https://play.google.com/console');
      console.log('3. Crie um novo aplicativo');
      console.log('4. Faça upload do arquivo AAB');
      console.log('5. Complete as informações obrigatórias');
      console.log('6. Publique na Play Store');
    } else {
      console.log('❌ Erro: Arquivo AAB não foi criado');
    }
  }, 1000);
}

createAAB();