const { Client } = require('pg');
require('dotenv').config({ path: './.env' });
const { getDatabaseSslConfig } = require('./database-ssl');

async function clear() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: getDatabaseSslConfig(),
  });
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required.');
  }
  await client.connect();
  const res = await client.query("DELETE FROM \"user\" WHERE email='neu@test.de'");
  console.log('User deleted: ' + res.rowCount);
  await client.end();
}
clear().catch(console.error);
