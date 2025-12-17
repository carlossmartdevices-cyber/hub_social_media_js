require('dotenv').config();
const axios = require('axios');

async function testAI() {
  try {
    console.log('Testing xAI API...');
    console.log('API Key present:', !!process.env.XAI_API_KEY);
    console.log('API Key length:', process.env.XAI_API_KEY?.length || 0);

    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-beta',
        messages: [{ role: 'user', content: 'Say "AI is working" in 3 words' }],
        max_tokens: 10,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.XAI_API_KEY}`
        },
        timeout: 10000
      }
    );

    console.log('✅ API Response:', response.data.choices[0].message.content);
    console.log('✅ AI is working correctly!');
  } catch (error) {
    console.error('❌ Error testing AI:');
    console.error('Status:', error.response?.status);
    console.error('Message:', error.response?.data || error.message);
  }
}

testAI();
