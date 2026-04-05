const { tokenStorage } = require('./src/utils/token-storage.js');
async function test() {
  const token = await tokenStorage.getAccessToken();
  const res = await fetch('http://127.0.0.1:3000/api/v1/providers/me/portfolio', {
    headers: { Authorization: `Bearer ${token}` }
  });
  console.log(await res.json());
}
test();
