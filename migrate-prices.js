import pkg from 'pg';
const { Pool } = pkg;

// Função para converter preço para formato brasileiro
function formatToBrazilianPrice(value) {
  const numericValue = parseFloat(value) || 0;
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(numericValue);
}

async function migratePricesToBrazilianFormat() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Iniciando migração de preços para formato brasileiro...');
    
    // Buscar todos os serviços com preços
    const result = await pool.query('SELECT id, title, price FROM services');
    
    console.log(`Encontrados ${result.rows.length} serviços para migrar`);
    
    let migratedCount = 0;
    
    for (const service of result.rows) {
      const currentPrice = service.price;
      const brazilianPrice = formatToBrazilianPrice(currentPrice);
      
      // Só atualizar se o formato mudou
      if (currentPrice !== brazilianPrice) {
        await pool.query(
          'UPDATE services SET price = $1 WHERE id = $2',
          [brazilianPrice, service.id]
        );
        
        console.log(`Serviço "${service.title}" (ID: ${service.id}): ${currentPrice} → ${brazilianPrice}`);
        migratedCount++;
      }
    }
    
    console.log(`\nMigração concluída! ${migratedCount} preços foram atualizados para o formato brasileiro.`);
    
  } catch (error) {
    console.error('Erro durante a migração:', error);
  } finally {
    await pool.end();
  }
}

migratePricesToBrazilianFormat();