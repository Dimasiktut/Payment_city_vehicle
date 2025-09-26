// server.js
import express from 'express';
import path from 'path';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

// Экранирование MarkdownV2 без типов
const escapeMarkdownV2 = (text) => {
  const specials = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  return specials.reduce((acc, char) => acc.replaceAll(char, `\\${char}`), text);
};

app.post('/api/sendMessage', async (req, res) => {
  const { chatId, text } = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!chatId || !text) return res.status(400).json({ error: 'Missing chatId or text' });
  if (!BOT_TOKEN) return res.status(500).json({ error: 'Telegram bot token not configured' });

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: escapeMarkdownV2(text),
        parse_mode: 'MarkdownV2',
      }),
    });

    const data = await response.json();
    if (!data.ok) return res.status(400).json(data);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error', message: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
