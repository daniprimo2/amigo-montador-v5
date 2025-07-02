/**
 * Utilitários para processamento de imagens em base64
 */

export interface ImageProcessResult {
  data: string;
  mimetype: string;
  size: number;
}

/**
 * Converte um arquivo de upload para base64
 */
export function convertFileToBase64(file: any): ImageProcessResult {
  if (!file.mimetype.startsWith('image/')) {
    throw new Error('O arquivo deve ser uma imagem');
  }

  // Verificar tamanho (max 10MB)
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('A imagem deve ter menos de 10MB');
  }

  const base64Data = `data:${file.mimetype};base64,${file.data.toString('base64')}`;
  
  return {
    data: base64Data,
    mimetype: file.mimetype,
    size: file.size
  };
}

/**
 * Valida se uma string é uma imagem base64 válida
 */
export function isValidBase64Image(base64String: string): boolean {
  if (!base64String) return false;
  
  const base64Pattern = /^data:image\/(jpeg|jpg|png|gif|webp);base64,/;
  return base64Pattern.test(base64String);
}

/**
 * Extrai o mimetype de uma string base64
 */
export function getMimetypeFromBase64(base64String: string): string | null {
  const matches = base64String.match(/^data:([^;]+);base64,/);
  return matches ? matches[1] : null;
}

/**
 * Estima o tamanho em bytes de uma string base64
 */
export function estimateBase64Size(base64String: string): number {
  // Remove o prefixo data:type;base64,
  const base64Data = base64String.split(',')[1];
  if (!base64Data) return 0;
  
  // Base64 usa 4 caracteres para representar 3 bytes
  // Calcula o tamanho aproximado
  return Math.floor(base64Data.length * 3 / 4);
}