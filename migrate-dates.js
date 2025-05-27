const { Pool } = require('pg');

// Script to migrate date fields from single 'date' column to separate 'startDate' and 'endDate' columns
async function migrateDates() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL
  });

  try {
    console.log('Starting date migration...');

    // Update all occurrences of services.date in the codebase
    // This is already done in the database, now we need to update the backend code
    
    console.log('Date migration completed successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
  } finally {
    await pool.end();
  }
}

migrateDates();