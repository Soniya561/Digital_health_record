async function test() {
  console.log('Testing Login...');
  const resp = await fetch('https://digital-health-record.onrender.com/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'patient@demo.com', password: 'password123' })
  });
  const data = await resp.json();
  console.log('Login Response:', JSON.stringify(data, null, 2));

  if (data.token) {
    console.log('Testing Get Records...');
    const recordsResp = await fetch('https://digital-health-record.onrender.com/api/records', {
      method: 'GET',
      headers: { 
        'Authorization': `Bearer ${data.token}`,
        'Content-Type': 'application/json'
      }
    });
    const recordsData = await recordsResp.json();
    console.log('Records Response:', JSON.stringify(recordsData, null, 2));
  }
}
test();
