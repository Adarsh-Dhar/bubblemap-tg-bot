import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
import puppeteer from 'puppeteer';

// Get token from environment variables
const token = process.env.TG_TOKEN;
const bot = new TelegramBot(token, {polling: true});

// Valid chains
const VALID_CHAINS = ['eth', 'bsc', 'polygon', 'arbitrum', 'optimism', 'avalanche'];

// Start/Help Command
bot.onText(/\/start|\/help/, (msg) => {
  const chatId = msg.chat.id;
  const message = `🤖 **Welcome to TokenInfoBot!**

I can help you analyze cryptocurrency tokens with:
- Bubble Map Visualization
- Market Data
- Decentralization Scores

**Commands:**
- /lookup <chain> <address> - Get detailed token analysis
- /screenshot <chain> <address> - Get bubblemap visualization
- /miniapp - Open interactive web application
- /help - Show this help message

**Supported chains:** eth, bsc, polygon, arbitrum, optimism, avalanche`;
  
  bot.sendMessage(chatId, message, {parse_mode: 'Markdown'});
});

// Lookup Command (comprehensive info + screenshot)
bot.onText(/\/lookup (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1].trim().split(' ');
  
  if (params.length < 2) {
    return bot.sendMessage(chatId, "❌ Please specify both chain and contract address.\nExample: `/lookup bsc 0x...`");
  }
  
  const chain = params[0].toLowerCase();
  const contractAddress = params[1];
  
  if (!VALID_CHAINS.includes(chain)) {
    return bot.sendMessage(chatId, `❌ Invalid chain. Supported chains: ${VALID_CHAINS.join(', ')}`);
  }
  
  if (isValidAddress(contractAddress)) {
    await lookupToken(chatId, chain, contractAddress);
  } else {
    bot.sendMessage(chatId, "❌ Invalid contract address format");
  }
});

// Screenshot Command
bot.onText(/\/screenshot (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1].trim().split(' ');
  
  if (params.length < 2) {
    return bot.sendMessage(chatId, "❌ Please specify both chain and contract address.\nExample: `/screenshot bsc 0x...`");
  }
  
  const chain = params[0].toLowerCase();
  const contractAddress = params[1];
  
  if (!VALID_CHAINS.includes(chain)) {
    return bot.sendMessage(chatId, `❌ Invalid chain. Supported chains: ${VALID_CHAINS.join(', ')}`);
  }
  
  if (isValidAddress(contractAddress)) {
    await sendTokenScreenshot(chatId, chain, contractAddress);
  } else {
    bot.sendMessage(chatId, "❌ Invalid contract address format");
  }
});

// Mini App Command
bot.onText(/\/miniapp(.*)/, (msg, match) => {
  const chatId = msg.chat.id;
  const params = match[1] ? match[1].trim().split(' ') : [];
  
  if (params.length >= 2) {
    const chain = params[0].toLowerCase();
    const address = params[1];
    
    if (VALID_CHAINS.includes(chain) && isValidAddress(address)) {
      // Launch with specific chain and address
      bot.sendMessage(chatId, `📊 Open Interactive Bubblemap for ${chain.toUpperCase()} token ${address}`, {
        reply_markup: {
          inline_keyboard: [[
            {
              text: "Launch Bubblemap App",
              web_app: {url: `https://bubblemap-tg-bot-1j79.vercel.app/${chain}/${address}`},
            }
          ]]
        }
      });
    } else {
      promptForChainAndAddress(chatId, "miniapp");
    }
  } else {
    promptForChainAndAddress(chatId, "miniapp");
  }
});

/**
 * Prompt user to provide chain and address for miniapp
 */
function promptForChainAndAddress(chatId, command) {
  const message = `Please provide a blockchain and contract address:
  
Example: /${command} eth 0x...

Supported chains: ${VALID_CHAINS.join(', ')}`;

  bot.sendMessage(chatId, message);
}


// Direct Message Handler for contract addresses
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  
  const chatId = msg.chat.id;
  const parts = msg.text.trim().split(' ');
  
  // If exactly two parts and first is a valid chain, handle as chain + address combo
  if (parts.length === 2 && VALID_CHAINS.includes(parts[0].toLowerCase())) {
    const chain = parts[0].toLowerCase();
    const possibleAddress = parts[1];
    
    if (isValidAddress(possibleAddress)) {
      await lookupToken(chatId, chain, possibleAddress);
    } else {
      bot.sendMessage(chatId, "❌ Invalid contract address format");
    }
  } 
  // If it's a single word that looks like an address, ask for chain
  else if (parts.length === 1 && isValidAddress(parts[0])) {
    const address = parts[0];
    await promptForChain(chatId, address);
  }
});

/**
 * Prompt user to select a chain for the provided address
 */
async function promptForChain(chatId, address) {
  const keyboard = VALID_CHAINS.map(chain => [{
    text: chain.toUpperCase(),
    callback_data: `chain_${chain}_${address}`
  }]);
  
  bot.sendMessage(chatId, `Please select a blockchain for address ${address}:`, {
    reply_markup: {
      inline_keyboard: keyboard
    }
  });
}

// Handle chain selection callback
bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data;
  const chatId = callbackQuery.message.chat.id;
  
  if (data.startsWith('chain_')) {
    const parts = data.split('_');
    const chain = parts[1];
    const address = parts[2];
    
    if (VALID_CHAINS.includes(chain) && isValidAddress(address)) {
      bot.answerCallbackQuery(callbackQuery.id);
      await lookupToken(chatId, chain, address);
    }
  }
});

/**
 * Check if text appears to be a valid contract address
 */
function isValidAddress(text) {
  return /^0x[a-fA-F0-9]{40}$/.test(text);
}

/**
 * Look up token information by contract address
 */
async function lookupToken(chatId, chain, address) {
  try {
    bot.sendMessage(chatId, `🔍 Looking up information for contract: ${address} on ${chain.toUpperCase()}`);
    
    const response = await axios.get(`https://api-legacy.bubblemaps.io/map-data?token=${address}&chain=${chain}`);
    const legacyResponse = await axios.get(`https://api-legacy.bubblemaps.io/map-metadata?chain=${chain}&token=${address}`);
    
    const tokenData = response.data;
    const tokenMetadata = legacyResponse.data;
    
    // Get proper block explorer URL based on chain
    const explorerUrl = getExplorerUrl(chain, address);
    
    const message = `
*Token Information*
📝 *Name:* ${tokenData.full_name}
🔤 *Symbol:* ${tokenData.symbol}
⛓️ *Chain:* ${chain.toUpperCase()}
🔗 *Contract:* [${address}](${explorerUrl})
🔢 *Decentralisation Score:* ${tokenMetadata.decentralisation_score}
👥 *Holders:* ${tokenMetadata.holders_count || 'Unknown'}
💰 *Total Supply:* ${tokenData.total_supply ? formatSupply(tokenData.total_supply, tokenData.decimals) : 'Unknown'}

[View on Bubblemaps](https://app.bubblemaps.io/${chain}/token/${address})
`;
    
    // Send text information
    bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      disable_web_page_preview: true
    });
    
    // Generate and send screenshot
    const screenshot = await generateBubbleMapScreenshot(chain, address);
    if (screenshot) {
      bot.sendPhoto(chatId, screenshot);
    }
  } catch (error) {
    console.error('Error looking up token:', error);
    bot.sendMessage(chatId, "❌ Sorry, I couldn't retrieve information for that token. Please try again later.");
  }
}

/**
 * Send just the token screenshot
 */
async function sendTokenScreenshot(chatId, chain, address) {
  try {
    bot.sendMessage(chatId, `📸 Generating bubblemap for: ${address} on ${chain.toUpperCase()}...`);
    
    const screenshot = await generateBubbleMapScreenshot(chain, address);
    
    if (screenshot) {
      await bot.sendPhoto(chatId, screenshot, {
        caption: `Bubblemap for ${address} on ${chain.toUpperCase()}`
      });
    } else {
      bot.sendMessage(chatId, "❌ Failed to generate screenshot. Please try again later.");
    }
  } catch (error) {
    console.error('Error generating screenshot:', error);
    bot.sendMessage(chatId, "❌ Sorry, I couldn't generate a screenshot for that token.");
  }
}

/**
 * Get appropriate blockchain explorer URL based on chain
 */
function getExplorerUrl(chain, address) {
  const explorers = {
    'eth': `https://etherscan.io/address/${address}`,
    'bsc': `https://bscscan.com/address/${address}`,
    'polygon': `https://polygonscan.com/address/${address}`,
    'arbitrum': `https://arbiscan.io/address/${address}`,
    'optimism': `https://optimistic.etherscan.io/address/${address}`,
    'avalanche': `https://snowtrace.io/address/${address}`
  };
  
  return explorers[chain] || `https://etherscan.io/address/${address}`;
}

async function generateBubbleMapScreenshot(chain, tokenAddress) {
  const browser = await puppeteer.launch({
    executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-shields']
  });
  
  const page = await browser.newPage();
  await page.setViewport({width: 1200, height: 800, deviceScaleFactor: 2});
  
  try {
    await page.goto(`https://app.bubblemaps.io/${chain}/token/${tokenAddress}?small_text&hide_context`, {
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 8000));
    
    return await page.screenshot({
      type: 'jpeg',
      quality: 90,
      fullPage: false
    });
  } finally {
    await browser.close();
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