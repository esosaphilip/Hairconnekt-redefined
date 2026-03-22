require('dotenv').config();
const { Client } = require('pg');

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  console.log('--- FIXING DB SCHEMA ---');
  try {
    await client.query(`ALTER TABLE providers ADD COLUMN "avatarUrl" varchar;`);
    console.log('Added avatarUrl to providers table successfully.');
  } catch (e) {
    console.log('Column might already exist or error:', e.message);
  }

  console.log('\n--- PROVIDER AVATARS ---');
  try {
    const res1 = await client.query(`
      SELECT u.email, u."avatarUrl" as user_avatar,
             p."businessName", p."avatarUrl" as provider_avatar
      FROM users u
      LEFT JOIN providers p ON p."userId" = u.id
      WHERE u.role = 'provider'
      LIMIT 5;
    `);
    console.table(res1.rows);
  } catch (e) { console.log('Query 1 Error:', e.message); }

  console.log('\n--- CLIENT AVATARS ---');
  try {
    const res2 = await client.query(`
      SELECT u.email, u."avatarUrl" as user_avatar
      FROM users u
      WHERE u.role = 'client'
      LIMIT 5;
    `);
    console.table(res2.rows);
  } catch (e) { console.log('Query 2 Error:', e.message); }

  console.log('\n--- PORTFOLIO IMAGES ---');
  try {
    const res3 = await client.query(`
      SELECT id, "providerId", "imageUrl", "createdAt"
      FROM portfolio_images
      ORDER BY "createdAt" DESC
      LIMIT 10;
    `);
    console.table(res3.rows);
  } catch (e) { console.log('Query 3 Error:', e.message); }

  await client.end();
}

run().catch(console.error);
