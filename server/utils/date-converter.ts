/**
 * Utilitários para conversão de datas
 */

/**
 * Converte uma string de data no formato DD/MM/YYYY para objeto Date
 * @param dateStr String no formato DD/MM/YYYY
 * @returns Objeto Date
 */
export function convertBrazilianDateToDate(dateStr: string): Date {
  try {
    const parts = dateStr.trim().split('/');
    if (parts.length === 3) {
      const [day, month, year] = parts;
      return new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`);
    }
    return new Date(dateStr);
  } catch {
    return new Date();
  }
}

/**
 * Processa um campo de data que pode conter uma única data ou intervalo
 * e retorna as datas de início e fim
 * @param dateField String no formato "DD/MM/YYYY" ou "DD/MM/YYYY - DD/MM/YYYY"
 * @returns Objeto com startDate e endDate
 */
export function processDateField(dateField: string): { startDate: Date; endDate: Date } {
  if (dateField.includes(' - ')) {
    // Formato "DD/MM/YYYY - DD/MM/YYYY"
    const [startDateStr, endDateStr] = dateField.split(' - ').map((d: string) => d.trim());
    return {
      startDate: convertBrazilianDateToDate(startDateStr),
      endDate: convertBrazilianDateToDate(endDateStr)
    };
  } else {
    // Formato único "DD/MM/YYYY"
    const dateObj = convertBrazilianDateToDate(dateField);
    return {
      startDate: dateObj,
      endDate: dateObj
    };
  }
}