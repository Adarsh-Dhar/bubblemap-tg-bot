import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');

// Get token from environment variables
const token = process.env.TG_TOKEN;

// Create a bot instance
const bot = new TelegramBot(token, {polling: true});

// Start/Help Command
bot.onText(/\/start|\/help/, (msg) => {
  const chatId = msg.chat.id;
  const message = `
🤖 *Welcome to TokenInfoBot!*

I can help you get information about cryptocurrency tokens.

*Commands:*
- /lookup [contract address] - Look up details about a token
- /help - Show this help message

You can also directly paste a contract address and I'll look it up for you.
`;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// Token Lookup Command
bot.onText(/\/lookup (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const contractAddress = match[1].trim();
  
  if (isValidAddress(contractAddress)) {
    await lookupToken(chatId, contractAddress);
  } else {
    bot.sendMessage(chatId, "❌ That doesn't look like a valid contract address. Please check and try again.");
  }
});

// Direct Message Handler for contract addresses
bot.on('message', async (msg) => {
  // Skip processing commands or if there's no text
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const possibleAddress = msg.text.trim();
  
  if (isValidAddress(possibleAddress)) {
    await lookupToken(chatId, possibleAddress);
  }
});

/**
 * Check if text appears to be a valid contract address
 * This is a basic check for Ethereum-style addresses
 */
function isValidAddress(text) {
  // Basic validation for Ethereum-style addresses
  return /^0x[a-fA-F0-9]{40}$/.test(text);
}

/**
 * Look up token information by contract address
 */
async function lookupToken(chatId, address) {
  try {
    bot.sendMessage(chatId, `🔍 Looking up information for contract: ${address}`);
    const response = await axios.get(`https://api-legacy.bubblemaps.io/map-data?token=${address}&chain=bsc`);

    const tokenData = response.data;
    const tokenInfo = {
      name: tokenData.full_name,
      symbol: tokenData.symbol,
    };
    
    const message = `
*Token Information*
📝 *Name:* ${tokenInfo.name}
🔤 *Symbol:* ${tokenInfo.symbol}
🔗 *Contract:* [${address}](https://etherscan.io/address/${address})
`;
    
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
  } catch (error) {
    console.error('Error looking up token:', error);
    bot.sendMessage(chatId, "❌ Sorry, I couldn't retrieve information for that token. Please try again later.");
  }
}

/**
 * Format token supply with proper decimal places
 */
function formatSupply(supply, decimals) {
  const num = parseInt(supply) / Math.pow(10, decimals);
  return num.toLocaleString();
}

console.log('Bot is running...');