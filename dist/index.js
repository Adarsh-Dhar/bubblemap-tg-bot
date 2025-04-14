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
// Get token from environment variables
const token = process.env.TG_TOKEN;
// Create a bot instance
const bot = new TelegramBot(token, { polling: true });
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
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});
// Token Lookup Command
bot.onText(/\/lookup (.+)/, (msg, match) => __awaiter(void 0, void 0, void 0, function* () {
    const chatId = msg.chat.id;
    const contractAddress = match[1].trim();
    if (isValidAddress(contractAddress)) {
        yield lookupToken(chatId, contractAddress);
    }
    else {
        bot.sendMessage(chatId, "❌ That doesn't look like a valid contract address. Please check and try again.");
    }
}));
// Direct Message Handler for contract addresses
bot.on('message', (msg) => __awaiter(void 0, void 0, void 0, function* () {
    // Skip processing commands or if there's no text
    if (!msg.text || msg.text.startsWith('/'))
        return;
    const chatId = msg.chat.id;
    const possibleAddress = msg.text.trim();
    if (isValidAddress(possibleAddress)) {
        yield lookupToken(chatId, possibleAddress);
    }
}));
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
function lookupToken(chatId, address) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            bot.sendMessage(chatId, `🔍 Looking up information for contract: ${address}`);
            const response = yield axios.get(`https://api-legacy.bubblemaps.io/map-data?token=${address}&chain=bsc`);
            const screenshot = yield generateBubbleMapScreenshot(address);
            const legacyResponse = yield axios.get(`https://api-legacy.bubblemaps.io/map-metadata?chain=bsc&token=${address}`);
            const tokenMetadata = legacyResponse.data;
            const tokenData = response.data;
            const message = `
  *Token Information*
  📝 *Name:* ${tokenData.full_name}
  🔤 *Symbol:* ${tokenData.symbol}
  🔗 *Contract:* [${address}](https://etherscan.io/address/${address})
  🔤 *Decentralisation Score:* ${tokenMetadata.decentralisation_score}
  `;
            // Send text information
            bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
            // Send screenshot as a separate photo message
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
function generateBubbleMapScreenshot(tokenAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const browser = yield puppeteer_1.default.launch({
            executablePath: '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-shields']
        });
        console.log('Browser launched', browser);
        const page = yield browser.newPage();
        console.log('New page created', page);
        yield page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 2 });
        try {
            yield page.goto(`https://app.bubblemaps.io/bsc/token/${tokenAddress}?small_text&hide_context`, {
                waitUntil: 'networkidle2',
                timeout: 60000
            });
            // Use setTimeout as an alternative to waitForTimeout
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
console.log('Bot is running...');
//# sourceMappingURL=index.js.map