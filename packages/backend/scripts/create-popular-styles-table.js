require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  } catch (e) {
    console.log('Could not create pgcrypto extension:', e.message);
  }

  await client.query(`
    CREATE TABLE IF NOT EXISTS popular_styles (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      name varchar NOT NULL UNIQUE,
      "imageUrl" varchar NULL,
      emoji varchar NOT NULL DEFAULT '✨',
      "colorHex" varchar NOT NULL DEFAULT '#C8860A',
      "sortOrder" int NOT NULL DEFAULT 0,
      "isActive" boolean NOT NULL DEFAULT true,
      "imageKey" varchar NULL,
      "createdAt" timestamptz NOT NULL DEFAULT now(),
      "updatedAt" timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`
    CREATE INDEX IF NOT EXISTS idx_popular_styles_active_sort
    ON popular_styles ("isActive", "sortOrder");
  `);

  await client.end();
  console.log('popular_styles table is ready.');
}

run().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});

