"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const puppeteer_1 = __importDefault(require("puppeteer"));
const fs_1 = __importDefault(require("fs"));
// Get token from environment variables
const token = process.env.TG_TOKEN;
const bot = new TelegramBot(token, { polling: true });
// Valid chains and their corresponding token lists
const VALID_CHAINS = ['eth', 'bsc', 'cro', 'sonic'];
// Load token data from JSON files
const tokenData = {
    eth: JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../address/eth.json'), 'utf8')),
    bsc: JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../address/bsc.json'), 'utf8')),
    cro: JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../address/cro.json'), 'utf8')),
    sonic: JSON.parse(fs_1.default.readFileSync(path_1.default.resolve(__dirname, '../address/sonic.json'), 'utf8'))
};
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
- /bubble - Open interactive web application
- /help - Show this help message

**Supported chains:** ${VALID_CHAINS.join(', ')}`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});
// Lookup Command (comprehensive info + screenshot)
bot.onText(/\/lookup(.*)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const params = match[1] ? match[1].trim().split(' ') : [];
    if (params.length < 2 || !params[0]) {
        // If no parameters, prompt for chain selection
        return promptForChainSelection(chatId, 'lookup');
    }
    const chain = params[0].toLowerCase();
    const contractAddress = params[1];
    if (!VALID_CHAINS.includes(chain)) {
        return bot.sendMessage(chatId, `❌ Invalid chain. Supported chains: ${VALID_CHAINS.join(', ')}`);
    }
    if (!contractAddress) {
        // If chain is provided but no address, prompt for token selection
        return promptForTokenSelection(chatId, chain, 'lookup');
    }
    if (isValidAddress(contractAddress)) {
        yield lookupToken(chatId, chain, contractAddress);
    }
    else {
        bot.sendMessage(chatId, "❌ Invalid contract address format");
    }
}));
// Screenshot Command
bot.onText(/\/screenshot(.*)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const params = match[1] ? match[1].trim().split(' ') : [];
    if (params.length < 2 || !params[0]) {
        // If no parameters, prompt for chain selection
        return promptForChainSelection(chatId, 'screenshot');
    }
    const chain = params[0].toLowerCase();
    const contractAddress = params[1];
    if (!VALID_CHAINS.includes(chain)) {
        return bot.sendMessage(chatId, `❌ Invalid chain. Supported chains: ${VALID_CHAINS.join(', ')}`);
    }
    if (!contractAddress) {
        // If chain is provided but no address, prompt for token selection
        return promptForTokenSelection(chatId, chain, 'screenshot');
    }
    if (isValidAddress(contractAddress)) {
        yield sendTokenScreenshot(chatId, chain, contractAddress);
    }
    else {
        bot.sendMessage(chatId, "❌ Invalid contract address format");
    }
}));
// Mini App Command
bot.onText(/\/bubble(.*)/, (msg, match) => {
    const chatId = msg.chat.id;
    const params = match[1] ? match[1].trim().split(' ') : [];
    if (params.length < 2 || !params[0]) {
        // If no parameters, prompt for chain selection
        return promptForChainSelection(chatId, 'bubble');
    }
    const chain = params[0].toLowerCase();
    const address = params[1];
    if (!VALID_CHAINS.includes(chain)) {
        return bot.sendMessage(chatId, `❌ Invalid chain. Supported chains: ${VALID_CHAINS.join(', ')}`);
    }
    if (!address) {
        // If chain is provided but no address, prompt for token selection
        return promptForTokenSelection(chatId, chain, 'bubble');
    }
    if (isValidAddress(address)) {
        // Launch with specific chain and address
        bot.sendMessage(chatId, `📊 Open Interactive Bubblemap for ${chain.toUpperCase()} token ${address}`, {
            reply_markup: {
                inline_keyboard: [[
                        {
                            text: "Launch Bubblemap App",
                            web_app: { url: `https://bubblemap-tg-bot-1j79.vercel.app/${chain}/${address}` },
                        }
                    ]]
            }
        });
    }
    else {
        bot.sendMessage(chatId, "❌ Invalid contract address format");
    }
});
/**
 * Prompt user to select a chain from available options
 */
function promptForChainSelection(chatId, command) {
    const keyboard = VALID_CHAINS.map(chain => [{
            text: chain.toUpperCase(),
            callback_data: `select_chain_${command}_${chain}`
        }]);
    bot.sendMessage(chatId, `Please select a blockchain:`, {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}
/**
 * Prompt user to select a token from the specified chain
 */
function promptForTokenSelection(chatId, chain, command) {
    const tokens = tokenData[chain];
    if (!tokens) {
        return bot.sendMessage(chatId, `❌ No tokens available for ${chain.toUpperCase()}`);
    }
    // Get token names and create buttons (max 8 per row)
    const tokenNames = Object.keys(tokens);
    const keyboard = [];
    const buttonsPerRow = 1;
    for (let i = 0; i < Math.min(tokenNames.length, 10); i++) {
        const tokenName = tokenNames[i];
        // Use an index instead of the full address in callback data
        if (i % buttonsPerRow === 0) {
            keyboard.push([]);
        }
        keyboard[Math.floor(i / buttonsPerRow)].push({
            text: tokenName,
            callback_data: `select_token_${command}_${chain}_${i}` // Using index instead of full address
        });
    }
    bot.sendMessage(chatId, `Select a token on ${chain.toUpperCase()}:`, {
        reply_markup: {
            inline_keyboard: keyboard
        }
    });
}
// Direct Message Handler for contract addresses
bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    if (!msg.text || msg.text.startsWith('/'))
        return;
    const chatId = msg.chat.id;
    const parts = msg.text.trim().split(' ');
    // If exactly two parts and first is a valid chain, handle as chain + address combo
    if (parts.length === 2 && VALID_CHAINS.includes(parts[0].toLowerCase())) {
        const chain = parts[0].toLowerCase();
        const possibleAddress = parts[1];
        if (isValidAddress(possibleAddress)) {
            yield lookupToken(chatId, chain, possibleAddress);
        }
        else {
            bot.sendMessage(chatId, "❌ Invalid contract address format");
        }
    }
    // If it's a single word that looks like an address, ask for chain
    else if (parts.length === 1 && isValidAddress(parts[0])) {
        const address = parts[0];
        yield promptForChain(chatId, address);
    }
    // If just a chain name, prompt for token selection
    else if (parts.length === 1 && VALID_CHAINS.includes(parts[0].toLowerCase())) {
        const chain = parts[0].toLowerCase();
        promptForTokenSelection(chatId, chain, 'lookup');
    }
}));
// Handle callback queries
bot.on('callback_query', (callbackQuery) => __awaiter(void 0, void 0, void 0, function* () {
    const data = callbackQuery.data;
    const chatId = callbackQuery.message.chat.id;
    // Handle chain selection
    if (data.startsWith('select_chain_')) {
        const parts = data.split('_');
        const command = parts[2];
        const chain = parts[3];
        bot.answerCallbackQuery(callbackQuery.id);
        promptForTokenSelection(chatId, chain, command);
    }
    // Handle token selection
    else if (data.startsWith('select_token_')) {
        const parts = data.split('_');
        const command = parts[2];
        const chain = parts[3];
        const tokenIndex = parseInt(parts[4]); // Get index instead of address
        // Get the actual address using the index
        const tokenNames = Object.keys(tokenData[chain]);
        const tokenName = tokenNames[tokenIndex];
        const address = tokenData[chain][tokenName];
        bot.answerCallbackQuery(callbackQuery.id);
        switch (command) {
            case 'lookup':
                yield lookupToken(chatId, chain, address);
                break;
            case 'screenshot':
                yield sendTokenScreenshot(chatId, chain, address);
                break;
            case 'bubble':
                bot.sendMessage(chatId, `📊 Open Interactive Bubblemap for ${chain.toUpperCase()} token ${address}`, {
                    reply_markup: {
                        inline_keyboard: [[
                                {
                                    text: "Launch Bubblemap App",
                                    web_app: { url: `https://bubblemap-tg-bot-1j79.vercel.app/${chain}/${address}` },
                                }
                            ]]
                    }
                });
                break;
        }
    }
    // Handle direct chain selection for an address
    else if (data.startsWith('chain_')) {
        const parts = data.split('_');
        const chain = parts[1];
        // For this case, we need a different approach since the address is too long
        // Store addresses temporarily in memory with a unique ID
        const addressId = parts[2];
        const address = tempAddressStorage[addressId];
        if (VALID_CHAINS.includes(chain) && isValidAddress(address)) {
            bot.answerCallbackQuery(callbackQuery.id);
            yield lookupToken(chatId, chain, address);
        }
    }
}));
const tempAddressStorage = {};
/**
 * Check if text appears to be a valid contract address
 */
function isValidAddress(text) {
    return /^0x[a-fA-F0-9]{40}$/.test(text);
}
/**
 * Look up token information by contract address
 */
function lookupToken(chatId, chain, address) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            bot.sendMessage(chatId, `🔍 Looking up information for contract: ${address} on ${chain.toUpperCase()}`);
            const response = yield axios.get(`https://api-legacy.bubblemaps.io/map-data?token=${address}&chain=${chain}`);
            const legacyResponse = yield axios.get(`https://api-legacy.bubblemaps.io/map-metadata?chain=${chain}&token=${address}`);
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
            const screenshot = yield generateBubbleMapScreenshot(chain, address);
            if (screenshot) {
                bot.sendPhoto(chatId, screenshot);
            }
        }
        catch (error) {
            console.error('Error looking up token:', error);
            bot.sendMessage(chatId, "❌ Sorry, I couldn't retrieve information for that token. Please try again later.");
        }
    });
}
/**
 * Send just the token screenshot
 */
function sendTokenScreenshot(chatId, chain, address) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            bot.sendMessage(chatId, `📸 Generating bubblemap for: ${address} on ${chain.toUpperCase()}...`);
            const screenshot = yield generateBubbleMapScreenshot(chain, address);
            if (screenshot) {
                yield bot.sendPhoto(chatId, screenshot, {
                    caption: `Bubblemap for ${address} on ${chain.toUpperCase()}`
                });
            }
            else {
                bot.sendMessage(chatId, "❌ Failed to generate screenshot. Please try again later.");
            }
        }
        catch (error) {
            console.error('Error generating screenshot:', error);
            bot.sendMessage(chatId, "❌ Sorry, I couldn't generate a screenshot for that token.");
        }
    });
}
/**
 * Get appropriate blockchain explorer URL based on chain
 */
function getExplorerUrl(chain, address) {
    const explorers = {
        'eth': `https://etherscan.io/address/${address}`,
        'bsc': `https://bscscan.com/address/${address}`,
        'cro': `https://cronoscan.com/address/${address}`,
        'sonic': `https://sonicexplorer.io/address/${address}`
    };
    return explorers[chain] || `https://etherscan.io/address/${address}`;
}
function generateBubbleMapScreenshot(chain, tokenAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-shields']
        });
        const page = yield browser.newPage();
        yield page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
        try {
            yield page.goto(`https://app.bubblemaps.io/${chain}/token/${tokenAddress}?small_text&hide_context`, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            // Wait for rendering
            yield new Promise(resolve => setTimeout(resolve, 8000));
            return yield page.screenshot({
                type: 'jpeg',
                quality: 90,
                fullPage: false
            });
        }
        finally {
            yield browser.close();
        }
    });
}
/**
 * Format token supply with proper decimal places
 */
function formatSupply(supply, decimals) {
    const num = parseInt(supply) / Math.pow(10, decimals);
    return num.toLocaleString();
}
function promptForChain(chatId, address) {
    return __awaiter(this, void 0, void 0, function* () {
        // Generate a short unique ID for this address
        const addressId = Date.now().toString(36);
        tempAddressStorage[addressId] = address;
        const keyboard = VALID_CHAINS.map(chain => [{
                text: chain.toUpperCase(),
                callback_data: `chain_${chain}_${addressId}`
            }]);
        bot.sendMessage(chatId, `Please select a blockchain for address ${address}:`, {
            reply_markup: {
                inline_keyboard: keyboard
            }
        });
        // Clean up the temp storage after some time
        setTimeout(() => {
            delete tempAddressStorage[addressId];
        }, 30 * 60 * 1000); // 30 minutes
    });
}
console.log('Bot is running...');
//# sourceMappingURL=index.js.map