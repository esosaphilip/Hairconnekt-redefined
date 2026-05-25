const { tokenStorage } = require('./src/utils/token-storage.js');
async function test() {
  const apiUrl = process.env.API_URL;
  if (!apiUrl) {
    throw new Error('API_URL is required.');
  }

  const token = await tokenStorage.getAccessToken();
  if (!token) {
    throw new Error('No access token available in token storage.');
  }

  const res = await fetch(`${apiUrl}/providers/me/portfolio`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(await res.json());
}
test();
