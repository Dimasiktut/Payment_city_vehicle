const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/sendMessage', async (req, res) => {
  const { text, chatId } = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!text || !chatId) return res.status(400).send('Missing text or chatId');
  if (!BOT_TOKEN) return res.status(500).send('Telegram bot token not configured');

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2' }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.description);
    res.json({ success: true });
  } catch (e) {
    res.status(500).send(e.message);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
