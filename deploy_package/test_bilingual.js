/**
 * Bilingual Telegram Bot Test
 * 
 * This script tests the Spanish and English language functionality
 */

const { LanguageManager } = require('./src/utils/languageManager');

function testBilingualFunctionality() {
  console.log('=== Testing Bilingual Telegram Bot ===\n');
  
  // Test with English user
  const englishChatId = '123456789';
  console.log('🇺🇸 Testing English Language:');
  console.log('Welcome Message:');
  console.log(LanguageManager.getWelcomeMessage(englishChatId));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test with Spanish user
  const spanishChatId = '987654321';
  LanguageManager.setUserLanguage(spanishChatId, 'es');
  console.log('🇪🇸 Testing Spanish Language:');
  console.log('Mensaje de Bienvenida:');
  console.log(LanguageManager.getWelcomeMessage(spanishChatId));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test status message
  const mockBotInfo = { username: 'hubcontenido_bot' };
  console.log('🇺🇸 English Status Message:');
  console.log(LanguageManager.getStatusMessage(englishChatId, mockBotInfo));
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🇪🇸 Spanish Status Message:');
  console.log(LanguageManager.getStatusMessage(spanishChatId, mockBotInfo));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test help message
  console.log('🇺🇸 English Help Message:');
  console.log(LanguageManager.getHelpMessage(englishChatId));
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🇪🇸 Spanish Help Message:');
  console.log(LanguageManager.getHelpMessage(spanishChatId));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test message response
  const mockMessage = {
    from: { first_name: 'Juan' },
    chat: { title: 'Test Channel', type: 'channel' },
    text: 'Hello, this is a test message!'
  };
  
  console.log('🇺🇸 English Message Response:');
  console.log(LanguageManager.getMessageResponse(englishChatId, mockMessage));
  console.log('\n' + '='.repeat(50) + '\n');
  
  console.log('🇪🇸 Spanish Message Response:');
  console.log(LanguageManager.getMessageResponse(spanishChatId, mockMessage));
  console.log('\n' + '='.repeat(50) + '\n');
  
  // Test individual message retrieval
  console.log('Individual Message Tests:');
  console.log('English live.starting:', LanguageManager.getMessage(englishChatId, 'live.starting'));
  console.log('Spanish live.starting:', LanguageManager.getMessage(spanishChatId, 'live.starting'));
  console.log('English errors.general:', LanguageManager.getMessage(englishChatId, 'errors.general'));
  console.log('Spanish errors.general:', LanguageManager.getMessage(spanishChatId, 'errors.general'));
  
  console.log('\n✅ All bilingual tests completed successfully!');
  console.log('\nSupported Languages:', LanguageManager.getSupportedLanguages());
  console.log('\nLanguage Preferences:');
  console.log(`Chat ${englishChatId}: ${LanguageManager.getUserLanguage(englishChatId)}`);
  console.log(`Chat ${spanishChatId}: ${LanguageManager.getUserLanguage(spanishChatId)}`);
}

// Run the test if this file is executed directly
if (require.main === module) {
  testBilingualFunctionality();
}

module.exports = testBilingualFunctionality;