import axios from 'axios';

async function testChatRestrictions() {
  console.log('🧪 Testing Chat Restrictions for Completed Services\n');
  
  try {
    // First, login as a user
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      username: 'lucas@montador.com',
      password: '123456'
    }, {
      withCredentials: true
    });
    
    console.log('✅ Login successful');
    
    // Get the cookies from login response
    const cookies = loginResponse.headers['set-cookie'];
    const cookieHeader = cookies ? cookies.join('; ') : '';
    
    // Try to send a message to a completed service (ID 17)
    const messageResponse = await axios.post('http://localhost:5000/api/services/17/messages', {
      content: 'Test message to completed service',
      assemblerId: 1
    }, {
      headers: {
        'Cookie': cookieHeader
      },
      withCredentials: true,
      validateStatus: function (status) {
        return status < 500; // Allow 4xx errors for testing
      }
    });
    
    console.log('\n📨 Message Send Test Results:');
    console.log(`Status: ${messageResponse.status}`);
    console.log(`Response: ${JSON.stringify(messageResponse.data, null, 2)}`);
    
    if (messageResponse.status === 400 && messageResponse.data.error === 'SERVICE_COMPLETED') {
      console.log('\n✅ SUCCESS: Backend properly blocks messages to completed services');
    } else {
      console.log('\n❌ ERROR: Backend should block messages to completed services');
    }
    
    // Test fetching messages (this should work)
    const messagesResponse = await axios.get('http://localhost:5000/api/services/17/messages?assemblerId=1', {
      headers: {
        'Cookie': cookieHeader
      },
      withCredentials: true
    });
    
    console.log('\n📥 Message Fetch Test Results:');
    console.log(`Status: ${messagesResponse.status}`);
    console.log(`Messages found: ${messagesResponse.data.length}`);
    
    if (messagesResponse.status === 200) {
      console.log('✅ SUCCESS: Can still fetch message history for completed services');
    } else {
      console.log('❌ ERROR: Should be able to fetch message history');
    }
    
    console.log('\n🎯 Chat Restrictions Test Complete!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
}

testChatRestrictions();