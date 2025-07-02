/**
 * Utilitários para processamento de imagens no frontend
 */

export interface ImageUploadResult {
  base64: string;
  file: File;
  preview: string;
}

/**
 * Converte um arquivo para base64
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Valida se um arquivo é uma imagem válida
 */
export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  return validTypes.includes(file.type);
}

/**
 * Verifica o tamanho máximo do arquivo (em MB)
 */
export function isFileSizeValid(file: File, maxSizeMB: number = 5): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * Cria uma URL de preview para uma imagem
 */
export function createImagePreview(file: File): string {
  return URL.createObjectURL(file);
}

/**
 * Remove a URL de preview para liberar memória
 */
export function revokeImagePreview(url: string): void {
  URL.revokeObjectURL(url);
}

/**
 * Processa um arquivo de imagem completo para upload
 */
export async function processImageFile(file: File, maxSizeMB: number = 5): Promise<ImageUploadResult> {
  if (!isValidImageFile(file)) {
    throw new Error('Arquivo deve ser uma imagem (JPEG, PNG, GIF, WebP)');
  }

  if (!isFileSizeValid(file, maxSizeMB)) {
    throw new Error(`Arquivo deve ter menos de ${maxSizeMB}MB`);
  }

  const base64 = await fileToBase64(file);
  const preview = createImagePreview(file);

  return {
    base64,
    file,
    preview
  };
}

/**
 * Renderiza uma imagem base64 ou URL normal
 */
export function getImageSrc(imageData: string | null | undefined): string {
  if (!imageData) {
    return '/default-avatar.svg'; // Fallback para avatar padrão
  }

  // Se já é uma data URL (base64), retorna diretamente
  if (imageData.startsWith('data:')) {
    return imageData;
  }

  // Se é uma URL normal, retorna como está
  if (imageData.startsWith('http') || imageData.startsWith('/')) {
    return imageData;
  }

  // Fallback para avatar padrão
  return '/default-avatar.svg';
}

/**
 * Comprime uma imagem base64 redimensionando-a
 */
export function compressImage(base64: string, maxWidth: number = 800, quality: number = 0.8): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;

      // Calcular novas dimensões mantendo proporção
      let { width, height } = img;
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }

      canvas.width = width;
      canvas.height = height;

      // Desenhar imagem redimensionada
      ctx.drawImage(img, 0, 0, width, height);

      // Converter para base64 com qualidade especificada
      const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
      resolve(compressedBase64);
    };
    img.src = base64;
  });
}