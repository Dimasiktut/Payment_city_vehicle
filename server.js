const express = require('express');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/sendMessage', async (req, res) => {
  const { chatId, text } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!chatId || !text || !BOT_TOKEN) {
    return res.status(400).json({ description: 'Недостаточно данных или BOT_TOKEN не задан' });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'MarkdownV2'
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json(data);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ description: 'Ошибка при отправке сообщения', error: err.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => console.log(`Server started on port ${PORT}`));
