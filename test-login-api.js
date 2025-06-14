const fetch = require('node-fetch');

async function testLogin() {
  try {
    const response = await fetch('http://localhost:8005/api/v1/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@chatadmin.com',
        password: 'admin123456'
      })
    });

    const result = await response.json();
    console.log('Status:', response.status);
    console.log('Response:', JSON.stringify(result, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testLogin();