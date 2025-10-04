const axios = require('axios');

const API_BASE = process.env.API_BASE || 'http://localhost:8000';

async function runTests() {
  console.log('🧪 Running integration tests...');
  
  try {
    // Test API Gateway health
    const healthResponse = await axios.get(`${API_BASE}/health`);
    console.log('✅ API Gateway health check passed');
    
    // Test user registration
    const userResponse = await axios.post(`${API_BASE}/api/users/register`, {
      email: process.env.TEST_EMAIL || 'test@example.com',
      password: process.env.TEST_PASSWORD || 'TestPassword123!',
      name: 'Test User'
    });
    console.log('✅ User registration test passed');
    
    console.log('🎉 All integration tests passed!');
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    process.exit(1);
  }
}

runTests();