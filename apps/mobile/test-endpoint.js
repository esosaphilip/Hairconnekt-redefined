async function run() {
  const apiUrl = process.env.API_URL;
  const testEmail = process.env.TEST_CLIENT_EMAIL;
  const testPassword = process.env.TEST_PASSWORD;

  if (!apiUrl) {
    throw new Error('API_URL is required.');
  }
  if (!testEmail) {
    throw new Error('TEST_CLIENT_EMAIL is required.');
  }
  if (!testPassword) {
    throw new Error('TEST_PASSWORD is required.');
  }

  let token = '';
  let providerId = '';
  let serviceId = '';

  try {
    console.log('Logging in test user:', testEmail);

    let res = await fetch(`${apiUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: testEmail, password: testPassword })
    });
    let data = await res.json();
    const loginToken = data?.accessToken ?? data?.data?.accessToken;
    if (!loginToken) throw new Error('Auth failed');
    token = loginToken;
    console.log('✅ Got token');

    // Get providers
    res = await fetch(`${apiUrl}/providers?limit=1`);
    data = await res.json();
    const providers = data.data || data;
    if (!providers || providers.length === 0) {
      console.log('⚠️ No providers. Test skipped.');
      return;
    }
    providerId = providers[0].id;
    console.log('✅ Got provider:', providerId);

    // Get services
    res = await fetch(`${apiUrl}/providers/${providerId}/services`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    data = await res.json();
    if (!data || data.length === 0) {
      console.log('⚠️ No services. Test skipped.');
      return;
    }
    serviceId = data[0].id;
    console.log('✅ Got service:', serviceId);

    // Post booking
    console.log('Posting /bookings...');
    res = await fetch(`${apiUrl}/bookings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        providerId,
        serviceIds: [serviceId],
        scheduledDate: '2026-03-20',
        scheduledTime: '14:00',
        isMobile: false,
        clientNotes: 'Test booking notes'
      })
    });
    data = await res.json();
    
    console.log('--- BOOKING RESPONSE ---');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('Test error:', err.message);
  }
}

run();
