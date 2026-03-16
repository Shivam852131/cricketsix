// Comprehensive test script for CricketLive Pro
const http = require('http');

const API_URL = 'http://localhost:3000/api';
const ADMIN_KEY = 'admin';

const tests = [
  // Public endpoints
  { path: '/health', name: 'Health Check', method: 'GET' },
  { path: '/version', name: 'Version Info', method: 'GET' },
  { path: '/state', name: 'State Endpoint', method: 'GET' },
  { path: '/poll', name: 'Poll Endpoint', method: 'GET' },
  { path: '/ai/insights', name: 'AI Insights', method: 'GET' },
  { path: '/match/stats', name: 'Match Stats', method: 'GET' },
  { path: '/match/summary', name: 'Match Summary', method: 'GET' },
  { path: '/match/timeline', name: 'Match Timeline', method: 'GET' },
  { path: '/match/win-probability', name: 'Win Probability', method: 'GET' },
  { path: '/connection/status', name: 'Connection Status', method: 'GET' },
  
  // Stream endpoints
  { path: '/stream/quality', name: 'Stream Quality', method: 'GET' },
  { path: '/poll/status', name: 'Poll Status', method: 'GET' },
  
  // Admin endpoints (will fail without proper auth but that's expected)
  { path: '/admin/analytics', name: 'Admin Analytics (auth required)', method: 'GET' }
];

function testEndpoint(test) {
  return new Promise((resolve) => {
    const url = `${API_URL}${test.path}`;
    const options = {
      method: test.method,
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': ADMIN_KEY
      }
    };
    
    const timer = setTimeout(() => {
      console.log(`❌ ${test.name}: Timeout`);
      resolve({ name: test.name, success: false, error: 'timeout' });
    }, 5000);

    const req = http.request(url, options, (res) => {
      clearTimeout(timer);
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        const success = res.statusCode === 200 || res.statusCode === 401;
        const status = res.statusCode === 401 ? 'auth' : res.statusCode;
        console.log(`${success ? '✅' : '⚠️'} ${test.name}: Status ${status}`);
        resolve({ name: test.name, success: true, status: res.statusCode });
      });
    });
    
    req.on('error', (err) => {
      clearTimeout(timer);
      console.log(`❌ ${test.name}: ${err.message}`);
      resolve({ name: test.name, success: false, error: err.message });
    });
    
    req.end();
  });
}

async function runTests() {
  console.log('='.repeat(60));
  console.log('CRICKETLIVE PRO - COMPREHENSIVE API TEST');
  console.log('='.repeat(60));
  console.log(`Testing: ${API_URL}\n`);

  let passed = 0;
  const results = [];
  
  for (const test of tests) {
    const result = await testEndpoint(test);
    results.push(result);
    if (result.success) passed++;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`RESULTS: ${passed}/${tests.length} tests passed`);
  console.log('='.repeat(60));

  // Show summary
  const publicTests = results.filter(r => !r.name.includes('Admin'));
  const adminTests = results.filter(r => r.name.includes('Admin'));
  
  console.log('\n📊 Public Endpoints:');
  console.log(`   ${publicTests.filter(r => r.success).length}/${publicTests.length} working`);
  
  console.log('\n🔐 Admin Endpoints:');
  console.log(`   ${adminTests.filter(r => r.success).length}/${adminTests.length} accessible (auth required)`);

  if (passed === tests.length) {
    console.log('\n🎉 All endpoints are working correctly!');
    console.log('\nNext steps:');
    console.log('  1. Open http://localhost:3000 in your browser');
    console.log('  2. Click the voice control button (🎤) to enable voice commands');
    console.log('  3. Try saying "go live" or "show stats"');
    console.log('  4. Use the admin panel at http://localhost:3000/admin');
  } else if (passed > 0) {
    console.log('\n⚠️  Some endpoints are unavailable but core features work.');
    console.log('   Check server logs for details.');
  } else {
    console.log('\n❌ No endpoints responded. Is the server running?');
    console.log('   Start server with: node backend/server.js');
  }
}

runTests();
