function getDatabaseSslConfig() {
  return process.env.DATABASE_SSL === 'false' ? false : true;
}

module.exports = { getDatabaseSslConfig };
