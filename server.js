const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const TelegramBot = require('node-telegram-bot-api');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
if (!BOT_TOKEN) throw new Error('TELEGRAM_BOT_TOKEN не задан!');

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

// Сохраняем chatId пользователей в памяти (для демо)
const chatMap = new Map();

// Deep linking
bot.onText(/\/start(?: (.+))?/, (msg, match) => {
  const chatId = msg.chat.id;
  const param = match ? match[1] : null;
  console.log('Новый пользователь:', chatId, param);
  chatMap.set(param || chatId, chatId); // связываем param с chatId

  bot.sendMessage(chatId, `Привет! Теперь бот знает твой chatId: ${chatId}\nПараметр: ${param}`);
});

// API для отправки сообщений из фронтенда
app.post('/api/sendMessage', async (req, res) => {
  const { param, text } = req.body;
  const chatId = chatMap.get(param);

  if (!chatId) return res.status(400).json({ error: 'Пользователь не найден' });
  if (!text) return res.status(400).json({ error: 'Отсутствует текст сообщения' }
