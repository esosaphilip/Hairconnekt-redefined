export const getDatabaseSslConfig = (): boolean | Record<string, never> => {
  return process.env.DATABASE_SSL === 'false' ? false : {};
};
