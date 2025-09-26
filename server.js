const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/sendMessage', async (req, res) => {
  const { text, chatId } = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  console.log('📨 Получен запрос на отправку:', { chatId });

  if (!text || !chatId) {
    console.error('❌ Ошибка: отсутствует text или chatId');
    return res.status(400).json({ error: 'Missing text or chatId' });
  }

  if (!BOT_TOKEN) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан!');
    return res.status(500).json({ error: 'Telegram bot token not configured' });
  }

  try {
    // ✅ ПРАВИЛЬНЫЙ URL — БЕЗ ПРОБЕЛОВ!
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'MarkdownV2',
      }),
    });

    const data = await response.json();
    console.log('📤 Ответ от Telegram:', data);

    if (!response.ok) {
      console.error('❌ Ошибка Telegram API:', data.description || data);
      return res.status(500).json({ error: 'Failed to send message', details: data.description });
    }

    console.log('✅ Сообщение успешно отправлено!');
    res.json({ success: true });

  } catch (error) {
    console.error('💥 Ошибка при отправке:', error.message);
    res.status(500).json({ error: 'Internal error', message: error.message });
  }
});

// Отдаём React-приложение
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
});
