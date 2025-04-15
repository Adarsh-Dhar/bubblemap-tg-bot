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
const canvas_1 = require("canvas");
const node_telegram_bot_api_1 = __importDefault(require("node-telegram-bot-api"));
const axios_1 = __importDefault(require("axios"));
// Load environment variables
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, '../.env') });
const token = process.env.TG_TOKEN;
const COINGECKO_API_KEY = process.env.COINGECKO_API_KEY;
// Initialize bot
const bot = new node_telegram_bot_api_1.default(token, { polling: true });
// Caching setup (simple in-memory cache for example)
const cache = new Map();
// Constants
const CHAIN = 'bsc'; // Change to appropriate chain
const CANVAS_SIZE = { width: 800, height: 600 };
// Start/Help Command
bot.onText(/\/start|\/help/, (msg) => {
    const chatId = msg.chat.id;
    const message = `
🤖 *Welcome to TokenInfoBot!*

I can help you analyze cryptocurrency tokens with:
- Bubble Map Visualization
- Market Data
- Decentralization Scores

*Commands:*
- /lookup [contract address] - Get detailed token analysis
- /help - Show this help message

Just paste a contract address to get started!
`;
    bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});
// Address handlers
bot.onText(/\/lookup (.+)/, handleAddressInput);
bot.on('message', handleAddressInput);
function handleAddressInput(msg, match) {
    return __awaiter(this, void 0, void 0, function* () {
        const chatId = msg.chat.id;
        const input = match ? match[1] : msg.text;
        if (!input || input.startsWith('/') || !isValidAddress(input)) {
            if (!match)
                return; // Only respond to valid addresses
            return bot.sendMessage(chatId, "❌ Invalid contract address format");
        }
        yield processTokenRequest(chatId, input.trim());
    });
}
// Validation
function isValidAddress(text) {
    return /^0x[a-fA-F0-9]{40}$/.test(text);
}
// Main processing flow
function processTokenRequest(chatId, address) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const processingMsg = yield bot.sendMessage(chatId, '🔍 Analyzing token...');
            // Parallel data fetching
            const [bubbleData, marketData, scoreData] = yield Promise.all([
                getBubbleMapData(address),
                getMarketData(address),
                getDecentralizationScore(address)
            ]);
            // Generate visualization
            const bubbleMapImage = yield generateBubbleMap(bubbleData.holders);
            // Format response
            const message = formatResponse({
                address,
                bubbleData,
                marketData,
                scoreData
            });
            // Send results
            yield bot.deleteMessage(chatId, processingMsg.message_id);
            yield bot.sendPhoto(chatId, bubbleMapImage);
            yield bot.sendMessage(chatId, message, {
                parse_mode: 'Markdown',
                disable_web_page_preview: true
            });
        }
        catch (error) {
            console.error('Processing error:', error);
            bot.sendMessage(chatId, '❌ Error analyzing token. Please try again later.');
        }
    });
}
// Data fetching functions
function getBubbleMapData(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheKey = `bubble-${address}`;
        if (cache.has(cacheKey))
            return cache.get(cacheKey);
        const response = yield axios_1.default.get(`https://api.bubblemaps.io/v1/map-data/${CHAIN}/${address}`);
        cache.set(cacheKey, response.data); // Cache for 5 minutes
        return response.data;
    });
}
function getMarketData(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const cacheKey = `market-${address}`;
        if (cache.has(cacheKey))
            return cache.get(cacheKey);
        const response = yield axios_1.default.get(`https://api.coingecko.com/api/v3/coins/${CHAIN}/contract/${address}`, { headers: { 'x-cg-api-key': COINGECKO_API_KEY } });
        const data = {
            price: response.data.market_data.current_price.usd,
            marketCap: response.data.market_data.market_cap.usd,
            volume: response.data.market_data.total_volume.usd
        };
        cache.set(cacheKey, data); // Cache for 3 minutes
        return data;
    });
}
function getDecentralizationScore(address) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield axios_1.default.get(`https://api.bubblemaps.io/v1/score/${CHAIN}/${address}`);
        return response.data.score;
    });
}
// Visualization generation
function generateBubbleMap(holders) {
    return __awaiter(this, void 0, void 0, function* () {
        const canvas = (0, canvas_1.createCanvas)(CANVAS_SIZE.width, CANVAS_SIZE.height);
        const ctx = canvas.getContext('2d');
        // Draw background
        ctx.fillStyle = '#f8f9fa';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Calculate positions
        const positions = calculateBubblePositions(holders);
        // Draw bubbles
        positions.forEach(({ x, y, radius, color }) => {
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.fill();
        });
        return canvas.toBuffer('image/png');
    });
}
function calculateBubblePositions(holders) {
    // Simple layout algorithm - consider using d3-force for complex layouts
    const MAX_BUBBLE_SIZE = 80;
    const MIN_BUBBLE_SIZE = 15;
    return holders.map(holder => ({
        x: Math.random() * (CANVAS_SIZE.width - 200) + 100,
        y: Math.random() * (CANVAS_SIZE.height - 200) + 100,
        radius: Math.max(MIN_BUBBLE_SIZE, (holder.percentage * MAX_BUBBLE_SIZE) / 100),
        color: `hsl(${Math.random() * 360}, 70%, 50%)`
    }));
}
// Response formatting
function formatResponse({ address, bubbleData, marketData, scoreData }) {
    var _a, _b;
    return `
*Token Analysis Report* 🔍

📛 *Name:* ${bubbleData.name || 'N/A'}
🔣 *Symbol:* ${bubbleData.symbol || 'N/A'}
📌 *Contract:* [${shortenAddress(address)}](https://bscscan.com/address/${address})

💰 *Market Data*
  ▸ Price: $${((_a = marketData.price) === null || _a === void 0 ? void 0 : _a.toFixed(4)) || 'N/A'}
  ▸ Market Cap: $${formatNumber(marketData.marketCap)}
  ▸ 24h Volume: $${formatNumber(marketData.volume)}

📊 *Distribution Analysis*
  ▸ Holders: ${bubbleData.holders.length}
  ▸ Top Holder: ${(_b = bubbleData.holders[0]) === null || _b === void 0 ? void 0 : _b.percentage.toFixed(2)}%
  ▸ Decentralization Score: ${scoreData.toFixed(1)}/10

ℹ️ *Insights*
${generateInsights(bubbleData, scoreData)}
`;
}
// Helper functions
function shortenAddress(address) {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
function formatNumber(num) {
    return num ? new Intl.NumberFormat().format(num) : 'N/A';
}
function generateInsights(bubbleData, score) {
    const insights = [];
    if (score < 5)
        insights.push('⚠️ Highly concentrated ownership');
    if (bubbleData.holders.length < 100)
        insights.push('⚠️ Low holder diversity');
    return insights.join('\n') || '✅ Healthy distribution pattern detected';
}
console.log('Bot started successfully');
//# sourceMappingURL=index.js.map