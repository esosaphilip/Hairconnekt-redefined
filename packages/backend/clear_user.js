const { Client } = require('pg');
async function clear() {
  const client = new Client({
    connectionString: 'postgresql://neondb_owner:npg_f01nAFwaBVit@ep-damp-rain-ak9khu2m-pooler.c-3.us-west-2.aws.neon.tech/neondb?sslmode=require'
  });
  await client.connect();
  const res = await client.query("DELETE FROM \"user\" WHERE email='neu@test.de'");
  console.log('User deleted: ' + res.rowCount);
  await client.end();
}
clear().catch(console.error);
