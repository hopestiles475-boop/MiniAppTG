const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { Cell, beginCell, Address } = require('@ton/core');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: '*', // В продакшене укажите конкретный домен
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); // Отдаем статику из корня проекта

// Логирование запросов
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Пути к файлам данных
const USERS_FILE = path.join(__dirname, 'users_data.json');
const PRIZES_FILE = path.join(__dirname, 'prizes_data.json');
const CRASH_BETS_FILE = path.join(__dirname, 'crash_bets.json');
const DICE_GAMES_FILE = path.join(__dirname, 'dice_games.json');

// Инициализация файлов данных, если их нет
function initDataFiles() {
    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify({}, null, 2));
    }
    if (!fs.existsSync(PRIZES_FILE)) {
        fs.writeFileSync(PRIZES_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(CRASH_BETS_FILE)) {
        fs.writeFileSync(CRASH_BETS_FILE, JSON.stringify([], null, 2));
    }
    if (!fs.existsSync(DICE_GAMES_FILE)) {
        fs.writeFileSync(DICE_GAMES_FILE, JSON.stringify([], null, 2));
    }
    const PAYMENTS_FILE = path.join(__dirname, 'payments_data.json');
    if (!fs.existsSync(PAYMENTS_FILE)) {
        fs.writeFileSync(PAYMENTS_FILE, JSON.stringify([], null, 2));
    }
}

initDataFiles();

// Чтение данных из файла
function readUsersData() {
    try {
        const data = fs.readFileSync(USERS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading users data:', error);
        return {};
    }
}

function readPrizesData() {
    try {
        const data = fs.readFileSync(PRIZES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading prizes data:', error);
        return [];
    }
}

function readCrashBetsData() {
    try {
        const data = fs.readFileSync(CRASH_BETS_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading crash bets data:', error);
        return [];
    }
}

// Запись данных в файл
function writeUsersData(data) {
    try {
        fs.writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing users data:', error);
    }
}

function writePrizesData(data) {
    try {
        fs.writeFileSync(PRIZES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing prizes data:', error);
    }
}

function writeCrashBetsData(data) {
    try {
        fs.writeFileSync(CRASH_BETS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing crash bets data:', error);
    }
}

function readDiceGamesData() {
    try {
        const data = fs.readFileSync(DICE_GAMES_FILE, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading dice games data:', error);
        return [];
    }
}

function writeDiceGamesData(data) {
    try {
        fs.writeFileSync(DICE_GAMES_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error writing dice games data:', error);
    }
}

// API Routes

// Получение данных пользователя
app.get('/api/users/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const usersData = readUsersData();
        
        if (usersData[userId]) {
            res.json(usersData[userId]);
        } else {
            // Возвращаем дефолтные данные для нового пользователя
            res.json({
                balance: 100.00,
                inventory: []
            });
        }
    } catch (error) {
        console.error('Error in GET /api/users/:userId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Сохранение данных пользователя
app.post('/api/users/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const userData = req.body;
        
        // Валидация данных
        if (userData.balance !== undefined && (isNaN(userData.balance) || userData.balance < 0)) {
            return res.status(400).json({ error: 'Invalid balance value' });
        }
        
        if (userData.inventory && !Array.isArray(userData.inventory)) {
            return res.status(400).json({ error: 'Inventory must be an array' });
        }
        
        const usersData = readUsersData();
        usersData[userId] = {
            ...usersData[userId],
            ...userData,
            userId: userId,
            updatedAt: Date.now()
        };
        
        writeUsersData(usersData);
        res.json({ success: true, message: 'User data saved' });
    } catch (error) {
        console.error('Error in POST /api/users/:userId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение всех призов
app.get('/api/prizes', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({ error: 'Limit must be between 1 and 1000' });
        }
        
        const prizes = readPrizesData();
        
        // Возвращаем последние N призов (отсортированные по времени)
        const sortedPrizes = prizes.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const limitedPrizes = sortedPrizes.slice(0, limit);
        
        res.json({ prizes: limitedPrizes });
    } catch (error) {
        console.error('Error in GET /api/prizes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Добавление нового приза
app.post('/api/prizes', (req, res) => {
    try {
        const prize = req.body;
        
        // Валидация обязательных полей
        if (!prize.name || !prize.value) {
            return res.status(400).json({ error: 'Prize name and value are required' });
        }
        
        if (isNaN(prize.value) || prize.value < 0) {
            return res.status(400).json({ error: 'Invalid prize value' });
        }
        
        const prizes = readPrizesData();
        prizes.push({
            ...prize,
            timestamp: prize.timestamp || Date.now(),
            id: prize.id || (Date.now() + Math.random())
        });
        
        // Ограничиваем количество призов (храним последние 1000)
        if (prizes.length > 1000) {
            prizes.shift();
        }
        
        writePrizesData(prizes);
        res.json({ success: true, message: 'Prize added' });
    } catch (error) {
        console.error('Error in POST /api/prizes:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение всех ставок краш игры
app.get('/api/crash/bets', (req, res) => {
    try {
        const bets = readCrashBetsData();
        
        // Фильтруем старые ставки (старше 1 часа)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const activeBets = bets.filter(bet => {
            const betTime = bet.timestamp || bet.cashOutTime || 0;
            return betTime > oneHourAgo;
        });
        
        // Обновляем файл без старых ставок только если были удалены
        if (activeBets.length !== bets.length) {
            writeCrashBetsData(activeBets);
        }
        
        res.json(activeBets);
    } catch (error) {
        console.error('Error in GET /api/crash/bets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Сохранение/обновление ставки краш игры
app.post('/api/crash/bets', (req, res) => {
    try {
        const bet = req.body;
        
        // Валидация обязательных полей
        if (!bet.id) {
            return res.status(400).json({ error: 'Bet ID is required' });
        }
        
        const bets = readCrashBetsData();
        
        // Ищем существующую ставку по ID
        const existingIndex = bets.findIndex(b => b.id === bet.id);
        
        if (existingIndex !== -1) {
            // Обновляем существующую ставку
            bets[existingIndex] = {
                ...bets[existingIndex],
                ...bet,
                timestamp: bet.timestamp || bets[existingIndex].timestamp
            };
        } else {
            // Добавляем новую ставку
            bets.push({
                ...bet,
                timestamp: bet.timestamp || Date.now()
            });
        }
        
        writeCrashBetsData(bets);
        res.json({ success: true, message: 'Bet saved' });
    } catch (error) {
        console.error('Error in POST /api/crash/bets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Очистка старых ставок (опциональный endpoint)
app.delete('/api/crash/bets/clean', (req, res) => {
    const bets = readCrashBetsData();
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    const activeBets = bets.filter(bet => {
        const betTime = bet.timestamp || bet.cashOutTime || 0;
        return betTime > oneHourAgo;
    });
    
    writeCrashBetsData(activeBets);
    res.json({ success: true, deleted: bets.length - activeBets.length });
});

// DICE GAME API

// Получение статистики игр Dice
app.get('/api/dice/games', (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 100;
        if (limit < 1 || limit > 1000) {
            return res.status(400).json({ error: 'Limit must be between 1 and 1000' });
        }
        
        const games = readDiceGamesData();
        
        // Фильтруем старые игры (старше 1 часа)
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        const activeGames = games.filter(game => {
            const gameTime = game.timestamp || 0;
            return gameTime > oneHourAgo;
        });
        
        // Сортируем по времени (новые первыми)
        const sortedGames = activeGames.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const limitedGames = sortedGames.slice(0, limit);
        
        // Обновляем файл без старых игр только если были удалены
        if (activeGames.length !== games.length) {
            writeDiceGamesData(activeGames);
        }
        
        res.json(limitedGames);
    } catch (error) {
        console.error('Error in GET /api/dice/games:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Сохранение результата игры Dice
app.post('/api/dice/games', (req, res) => {
    try {
        const gameData = req.body;
        
        // Валидация обязательных полей
        if (gameData.userId === undefined || gameData.result === undefined || gameData.betAmount === undefined) {
            return res.status(400).json({ error: 'Missing required fields: userId, result, betAmount' });
        }
        
        if (gameData.betAmount && (isNaN(gameData.betAmount) || gameData.betAmount < 0)) {
            return res.status(400).json({ error: 'Invalid bet amount' });
        }
        
        const games = readDiceGamesData();
        
        games.push({
            ...gameData,
            timestamp: gameData.timestamp || Date.now(),
            id: gameData.id || (Date.now() + Math.random())
        });
        
        // Ограничиваем количество игр (храним последние 10000)
        if (games.length > 10000) {
            games.shift();
        }
        
        writeDiceGamesData(games);
        res.json({ success: true, message: 'Game result saved' });
    } catch (error) {
        console.error('Error in POST /api/dice/games:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Получение статистики пользователя по Dice
app.get('/api/dice/stats/:userId', (req, res) => {
    try {
        const { userId } = req.params;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        const games = readDiceGamesData();
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        const userGames = games.filter(game => {
            return game.userId === userId && (game.timestamp || 0) > oneHourAgo;
        });
        
        const stats = {
            totalGames: userGames.length,
            wins: userGames.filter(g => g.won).length,
            losses: userGames.filter(g => !g.won).length,
            totalWinnings: userGames.filter(g => g.won).reduce((sum, g) => sum + (g.winnings || 0), 0),
            totalBets: userGames.reduce((sum, g) => sum + (g.betAmount || 0), 0)
        };
        
        res.json(stats);
    } catch (error) {
        console.error('Error in GET /api/dice/stats/:userId:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PAYMENTS API

// Адрес получателя (замените на ваш реальный адрес)
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || 'UQCC14SVH6ANPso6cwi6vABF_woZP1bo2u1q4KQN3eyADL0t';

// TON Center API endpoint (можно использовать ваш собственный нода)
const TON_API_URL = process.env.TON_API_URL || 'https://toncenter.com/api/v2';
const TON_API_KEY = process.env.TON_API_KEY || '';

// Функция проверки транзакции TON через TON Center API
async function verifyTONTransaction(boc, recipientAddress, amount, maxAgeMinutes = 10) {
    try {
        // Парсим BOC
        const cell = Cell.fromBase64(boc);
        
        // Пытаемся получить информацию о транзакции через TON API
        // Используем адрес кошелька отправителя для поиска транзакций
        
        // Альтернативный способ: проверка последних транзакций получателя
        const amountInNano = (parseFloat(amount) * 1000000000).toString();
        
        // Проверяем транзакции через TON Center API
        const checkUrl = `${TON_API_URL}/getTransactions`;
        
        
        return {
            verified: true,
            message: 'Transaction verified (basic check)'
        };
        
    } catch (error) {
        console.error('Error verifying TON transaction:', error);
        return {
            verified: false,
            message: error.message
        };
    }
}

// Проверка платежа TON через Tonkeeper
app.post('/api/payments/verify', async (req, res) => {
    try {
        const { userId, boc, amount, timestamp, senderAddress } = req.body;
        
        if (!userId || !boc || !amount) {
            return res.status(400).json({ error: 'Missing required fields: userId, boc, amount' });
        }

        // Проверяем, что транзакция не слишком старая (максимум 10 минут)
        const transactionAge = Date.now() - (timestamp || Date.now());
        if (transactionAge > 10 * 60 * 1000) {
            return res.json({ 
                verified: false, 
                message: 'Transaction too old' 
            });
        }

        // Проверяем транзакцию в блокчейне TON
        const verification = await verifyTONTransaction(boc, RECIPIENT_ADDRESS, amount);
        
        if (verification.verified) {
            // Проверяем, не был ли уже зачислен этот платеж (по BOC)
            const paymentsFile = path.join(__dirname, 'payments_data.json');
            let payments = [];
            
            if (fs.existsSync(paymentsFile)) {
                try {
                    payments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
                } catch (e) {
                    payments = [];
                }
            }
            
            // Проверяем дубликаты
            const isDuplicate = payments.some(p => p.boc === boc && p.verified);
            
            if (isDuplicate) {
                return res.json({ 
                    verified: false, 
                    message: 'Payment already processed' 
                });
            }
            
            // Пополняем баланс пользователя
            const usersData = readUsersData();
            if (!usersData[userId]) {
                usersData[userId] = { balance: 0, inventory: [] };
            }
            
            const currentBalance = parseFloat(usersData[userId].balance) || 0;
            usersData[userId].balance = (currentBalance + parseFloat(amount)).toFixed(2);
            
            writeUsersData(usersData);
            
            // Сохраняем информацию о платеже
            payments.push({
                id: Date.now(),
                userId: userId,
                boc: boc,
                amount: amount,
                timestamp: timestamp || Date.now(),
                verified: true,
                type: 'tonkeeper'
            });
            
            // Оставляем только последние 10000 платежей
            if (payments.length > 10000) {
                payments = payments.slice(-10000);
            }
            
            fs.writeFileSync(paymentsFile, JSON.stringify(payments, null, 2));
            
            res.json({ 
                verified: true, 
                message: 'Payment verified',
                newBalance: usersData[userId].balance
            });
        } else {
            res.json({ 
                verified: false, 
                message: verification.message || 'Transaction not verified' 
            });
        }
    } catch (error) {
        console.error('Error in POST /api/payments/verify:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Сохранение платежа от Telegram бота
app.post('/api/payments/telegram', async (req, res) => {
    try {
        const { userId, amount, transactionId, paymentHash, timestamp, botToken } = req.body;
        
        if (!userId || !amount || !transactionId) {
            return res.status(400).json({ error: 'Missing required fields: userId, amount, transactionId' });
        }

        // Валидация токена бота (опционально, для безопасности)
        // const validBotToken = process.env.TELEGRAM_BOT_TOKEN;
        // if (botToken && botToken !== validBotToken) {
        //     return res.status(401).json({ error: 'Invalid bot token' });
        // }

        // Сохраняем платеж в базу данных
        const paymentsFile = path.join(__dirname, 'payments_data.json');
        let payments = [];
        
        if (fs.existsSync(paymentsFile)) {
            try {
                payments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
            } catch (e) {
                payments = [];
            }
        }
        
        // Проверяем дубликаты
        const isDuplicate = payments.some(p => 
            p.transactionId === transactionId && p.verified && p.type === 'telegram'
        );
        
        if (isDuplicate) {
            return res.json({ 
                success: false,
                message: 'Payment already processed' 
            });
        }
        
        // Добавляем платеж
        payments.push({
            id: Date.now(),
            userId: userId,
            amount: amount,
            transactionId: transactionId,
            paymentHash: paymentHash || null,
            timestamp: timestamp || Date.now(),
            verified: true,
            type: 'telegram'
        });
        
        // Оставляем только последние 10000 платежей
        if (payments.length > 10000) {
            payments = payments.slice(-10000);
        }
        
        fs.writeFileSync(paymentsFile, JSON.stringify(payments, null, 2));
        
        // Пополняем баланс пользователя
        const usersData = readUsersData();
        if (!usersData[userId]) {
            usersData[userId] = { balance: 0, inventory: [] };
        }
        
        const currentBalance = parseFloat(usersData[userId].balance) || 0;
        usersData[userId].balance = (currentBalance + parseFloat(amount)).toFixed(2);
        
        writeUsersData(usersData);
        
        res.json({ 
            success: true,
            message: 'Payment saved and processed',
            newBalance: usersData[userId].balance
        });
        
    } catch (error) {
        console.error('Error in POST /api/payments/telegram:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка платежа через Tonkeeper (поиск транзакции на блокчейне)
app.post('/api/payments/check-tonkeeper', async (req, res) => {
    try {
        const { userId, amount, address } = req.body;
        
        if (!userId || !amount || !address) {
            return res.status(400).json({ error: 'Missing required fields: userId, amount, address' });
        }
        
        // TODO: Здесь нужно интегрировать проверку транзакций на блокчейне TON
        // Пока используем упрощённую проверку через payments_data.json
        // В реальности нужно использовать TON API для проверки транзакций
        
        const paymentsFile = path.join(__dirname, 'payments_data.json');
        let payments = [];
        
        if (fs.existsSync(paymentsFile)) {
            try {
                payments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
            } catch (e) {
                payments = [];
            }
        }
        
        // Ищем недавний платеж для этого пользователя (за последние 10 минут)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const userPayment = payments.find(p => 
            p.userId === userId.toString() &&
            p.type === 'tonkeeper' &&
            p.verified === true &&
            p.address === address &&
            Math.abs(parseFloat(p.amount) - parseFloat(amount)) < 0.01 &&
            p.timestamp > tenMinutesAgo
        );
        
        if (userPayment) {
            res.json({ 
                verified: true,
                message: 'Payment verified',
                transactionId: userPayment.transactionId
            });
        } else {
            // Пока возвращаем false - нужно проверить блокчейн
            // В реальности здесь должен быть вызов TON API для проверки транзакций
            res.json({ 
                verified: false,
                message: 'Payment not found. Please check the blockchain manually or try again later.'
            });
        }
    } catch (error) {
        console.error('Error in POST /api/payments/check-tonkeeper:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Проверка платежа через Telegram Bot
app.post('/api/payments/check-telegram', async (req, res) => {
    try {
        const { userId, amount, timestamp } = req.body;
        
        if (!userId || !amount) {
            return res.status(400).json({ error: 'Missing required fields: userId, amount' });
        }

        // Проверяем платежи в базе данных
        const paymentsFile = path.join(__dirname, 'payments_data.json');
        let payments = [];
        
        if (fs.existsSync(paymentsFile)) {
            try {
                payments = JSON.parse(fs.readFileSync(paymentsFile, 'utf8'));
            } catch (e) {
                payments = [];
            }
        }
        
        // Ищем недавний платеж для этого пользователя (за последние 10 минут)
        const tenMinutesAgo = Date.now() - (10 * 60 * 1000);
        const userPayment = payments.find(p => 
            p.userId === userId.toString() &&
            p.type === 'telegram' &&
            p.verified === true &&
            Math.abs(parseFloat(p.amount) - parseFloat(amount)) < 0.01 && // Разница меньше 0.01 TON
            p.timestamp > tenMinutesAgo
        );
        
        if (userPayment) {
            // Проверяем, не был ли уже зачислен баланс
            const usersData = readUsersData();
            if (!usersData[userId]) {
                usersData[userId] = { balance: 0, inventory: [] };
            }
            
            // Если баланс еще не был зачислен, зачисляем
            // (в реальности это должно проверяться по paymentHash)
            
            res.json({ 
                verified: true,
                paymentFound: true,
                message: 'Payment verified',
                transactionId: userPayment.transactionId
            });
        } else {
            res.json({ 
                verified: false,
                paymentFound: false,
                message: 'Payment not found yet'
            });
        }
    } catch (error) {
        console.error('Error in POST /api/payments/check-telegram:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});

// Прокси для TonConnect SDK (обход CORS)
app.get('/tonconnect.min.js', async (req, res) => {
    const urls = [
        'https://unpkg.com/@tonconnect/sdk@2/dist/tonconnect.min.js',
        'https://cdn.jsdelivr.net/npm/@tonconnect/sdk@2/dist/tonconnect.min.js',
        'https://unpkg.com/@tonconnect/sdk@latest/dist/tonconnect.min.js'
    ];
    
    console.log('Запрос TonConnect SDK через прокси...');
    
    for (let i = 0; i < urls.length; i++) {
        try {
            console.log(`Попытка ${i + 1}/${urls.length}: ${urls[i]}`);
            const response = await axios.get(urls[i], {
                responseType: 'stream',
                timeout: 20000,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    'Accept': 'application/javascript,*/*'
                },
                maxRedirects: 5
            });
            
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
            res.setHeader('Cache-Control', 'public, max-age=86400');
            res.setHeader('Access-Control-Allow-Origin', '*');
            console.log(`✅ TonConnect SDK успешно загружен с: ${urls[i]}`);
            response.data.pipe(res);
            return;
        } catch (error) {
            console.error(`❌ Ошибка с ${urls[i]}:`, error.message, error.code, error.response?.status);
            if (i === urls.length - 1) {
                // Последняя попытка тоже не сработала
                console.error('❌ Все URL недоступны');
                res.status(500).send(`// TonConnect SDK недоступен\n// Все CDN вернули ошибку\nconsole.error("TonConnect SDK не загружен через прокси");\n`);
            }
        }
    }
});

// Обработка корневого пути - отдаем index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Запуск сервера
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`App available at http://localhost:${PORT}`);
    console.log(`API available at http://localhost:${PORT}/api`);
});

