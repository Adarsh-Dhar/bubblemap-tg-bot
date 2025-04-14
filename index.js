require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');

// Replace 'YOUR_TOKEN' with the token you received from BotFather
const token = process.env.TG_TOKEN;

// Create a bot instance
const bot = new TelegramBot(token, {polling: true});

// Listen for any incoming messages
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  
  // Send "Hello World!" back to the user
  bot.sendMessage(chatId, 'Hello World!');
});

console.log('Bot is running...');
