// Debug version to check actual menu content being sent
require('dotenv').config();

const { LanguageManager } = require('./src/utils/languageManager');
const InlineMenuManager = require('./src/utils/inlineMenuManager');

function debugLanguageContent() {
  console.log('🔍 DEBUG: Checking Language Content\n');

  const menuManager = new InlineMenuManager();
  const testChatId = 8365312597; // Your actual chat ID from logs

  // Test English content
  console.log('1. ENGLISH CONTENT:');
  LanguageManager.setUserLanguage(testChatId, 'en');
  const mainMenuEN = menuManager.getMainMenu(testChatId);
  console.log('Main Menu Text:');
  console.log(mainMenuEN.text);
  console.log('\nMain Menu Buttons:');
  mainMenuEN.keyboard.forEach((row, i) => {
    console.log(`Row ${i + 1}: ${row.map(btn => btn.text).join(' | ')}`);
  });

  // Test Spanish content  
  console.log('\n' + '='.repeat(60));
  console.log('2. SPANISH CONTENT:');
  LanguageManager.setUserLanguage(testChatId, 'es');
  const mainMenuES = menuManager.getMainMenu(testChatId);
  console.log('Main Menu Text:');
  console.log(mainMenuES.text);
  console.log('\nMain Menu Buttons:');
  mainMenuES.keyboard.forEach((row, i) => {
    console.log(`Row ${i + 1}: ${row.map(btn => btn.text).join(' | ')}`);
  });

  // Test language change messages
  console.log('\n' + '='.repeat(60));
  console.log('3. LANGUAGE CHANGE MESSAGES:');
  console.log('Change to Spanish:', LanguageManager.getLanguageChangedMessage('es'));
  console.log('Change to English:', LanguageManager.getLanguageChangedMessage('en'));

  // Test post menu in Spanish
  console.log('\n' + '='.repeat(60));
  console.log('4. POST MENU IN SPANISH:');
  const postMenuES = menuManager.getPostMenu(testChatId);
  console.log('Post Menu Text:');
  console.log(postMenuES.text);
  console.log('\nPost Menu Buttons:');
  postMenuES.keyboard.forEach((row, i) => {
    console.log(`Row ${i + 1}: ${row.map(btn => btn.text).join(' | ')}`);
  });

  // Verify the actual user language setting
  console.log('\n' + '='.repeat(60));
  console.log('5. LANGUAGE VERIFICATION:');
  console.log(`Current language for chat ${testChatId}: ${LanguageManager.getUserLanguage(testChatId)}`);
  
  // Test if the issue is persistent storage
  console.log('\n6. LANGUAGE PERSISTENCE TEST:');
  LanguageManager.setUserLanguage(testChatId, 'es');
  console.log(`After setting to 'es': ${LanguageManager.getUserLanguage(testChatId)}`);
  LanguageManager.setUserLanguage(testChatId, 'en');
  console.log(`After setting to 'en': ${LanguageManager.getUserLanguage(testChatId)}`);
  LanguageManager.setUserLanguage(testChatId, 'es');
  console.log(`After setting back to 'es': ${LanguageManager.getUserLanguage(testChatId)}`);

  console.log('\n✅ Debug complete. Check if Spanish content is correctly generated above.');
}

debugLanguageContent();