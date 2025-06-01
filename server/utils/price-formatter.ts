/**
 * Utilitários para formatação de preços no padrão brasileiro
 */

/**
 * Converte um valor numérico para o formato brasileiro com vírgula
 * Exemplo: 1003.53 -> "1.003,53"
 * @param value - Valor numérico
 * @returns String formatada no padrão brasileiro
 */
export function formatToBrazilianPrice(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Converte um preço do formato brasileiro para número
 * Exemplo: "1.003,53" -> 1003.53
 * @param brazilianPrice - Preço no formato brasileiro
 * @returns Número decimal
 */
export function parseBrazilianPrice(brazilianPrice: string): number {
  // Remove espaços e caracteres especiais, mantém apenas números, pontos e vírgulas
  const cleaned = brazilianPrice.replace(/[^\d.,]/g, '');
  
  // Se contém vírgula, é formato brasileiro (1.000,50)
  if (cleaned.includes(',')) {
    // Remove pontos de milhar e substitui vírgula por ponto
    const normalized = cleaned.replace(/\./g, '').replace(',', '.');
    return parseFloat(normalized) || 0;
  }
  
  // Se não contém vírgula, pode ser formato americano (1000.50) ou só números
  return parseFloat(cleaned) || 0;
}

/**
 * Garante que um preço seja armazenado no formato brasileiro
 * @param input - Preço em qualquer formato (string ou number)
 * @returns String no formato brasileiro (ex: "1.003,53")
 */
export function ensureBrazilianFormat(input: string | number): string {
  if (typeof input === 'number') {
    return formatToBrazilianPrice(input);
  }
  
  // Se já está no formato brasileiro correto, retorna como está
  if (typeof input === 'string' && input.includes(',')) {
    const parsed = parseBrazilianPrice(input);
    return formatToBrazilianPrice(parsed);
  }
  
  // Converte de formato americano ou número para brasileiro
  const parsed = parseFloat(input) || 0;
  return formatToBrazilianPrice(parsed);
}

/**
 * Valida se um preço está no formato brasileiro válido
 * @param price - Preço a ser validado
 * @returns true se válido, false caso contrário
 */
export function isValidBrazilianPrice(price: string): boolean {
  // Padrão: números com pontos como separadores de milhares e vírgula como decimal
  // Exemplos válidos: "500,00", "1.000,50", "1.234.567,89"
  const brazilianPriceRegex = /^\d{1,3}(\.\d{3})*(,\d{2})?$/;
  return brazilianPriceRegex.test(price);
}