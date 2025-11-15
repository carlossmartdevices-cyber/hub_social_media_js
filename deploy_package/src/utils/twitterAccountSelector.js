const MultiAccountTwitterClient = require('../auth/multiAccountTwitterClient');

class TwitterAccountSelector {
  constructor() {
    try {
      this.multiClient = new MultiAccountTwitterClient();
    } catch (error) {
      console.log('MultiAccountTwitterClient not available:', error.message);
      this.multiClient = null;
    }
  }

  getAvailableAccounts() {
    if (!this.multiClient) {
      return [];
    }
    
    try {
      return this.multiClient.getAllAccountsInfo();
    } catch (error) {
      console.error('Error getting Twitter accounts:', error);
      return [];
    }
  }

  hasAccounts() {
    return this.getAvailableAccounts().length > 0;
  }

  generateAccountSelectionKeyboard(platform, timestamp, lang = 'en', actionPrefix = 'schedule') {
    const accounts = this.getAvailableAccounts();

    if (accounts.length === 0) {
      return {
        inline_keyboard: [
          [{
            text: lang === 'es' ? '❌ No hay cuentas configuradas' : '❌ No accounts configured',
            callback_data: 'no_twitter_accounts'
          }],
          [{
            text: lang === 'es' ? '🔙 Volver' : '🔙 Back',
            callback_data: 'menu_schedule'
          }]
        ]
      };
    }

    const keyboard = [];

    // Add each account as a button
    // actionPrefix can be 'schedule' for scheduling or 'post_now' for immediate posting
    accounts.forEach(account => {
      keyboard.push([{
        text: `@${account.username} (${account.displayName})`,
        callback_data: `${actionPrefix}_twitter_account_${account.accountName}_${platform}_${timestamp}`
      }]);
    });

    // Add back button
    keyboard.push([{
      text: lang === 'es' ? '🔙 Volver' : '🔙 Back',
      callback_data: 'menu_schedule'
    }]);

    return { inline_keyboard: keyboard };
  }
}

module.exports = TwitterAccountSelector;