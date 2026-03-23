const { Client } = require('pg');
require('dotenv').config({ path: './.env' });

async function seed() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    const query = `
      INSERT INTO availability_schedules
        ("providerId", "dayOfWeek", "isOpen", "openTime", "closeTime")
      SELECT
        p.id,
        d.day,
        CASE WHEN d.day BETWEEN 1 AND 5 THEN true ELSE false END,
        '09:00',
        '18:00'
      FROM providers p
      CROSS JOIN (
        SELECT generate_series(0, 6) AS day
      ) d
      WHERE p.status = 'approved'
      ON CONFLICT ("providerId", "dayOfWeek")
      DO NOTHING;
    `;
    
    const res = await client.query(query);
    console.log(`Successfully inserted ${res.rowCount} rows.`);
  } catch (err) {
    console.error('Error seeding data:', err);
  } finally {
    await client.end();
  }
}

seed();
