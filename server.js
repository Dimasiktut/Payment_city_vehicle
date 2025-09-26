const express = require('express');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'dist')));

app.post('/api/sendMessage', async (req, res) => {
  const { text, chatId } = req.body;
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  // 🔍 Логируем входящий запрос
  console.log('📨 Получен запрос на отправку сообщения:', { chatId, hasText: !!text });

  if (!text || !chatId) {
    console.error('❌ Ошибка: отсутствует text или chatId');
    return res.status(400).json({ error: 'Missing text or chatId' });
  }

  if (!BOT_TOKEN) {
    console.error('❌ Ошибка: TELEGRAM_BOT_TOKEN не задан в переменных окружения!');
    return res.status(500).json({ error: 'Telegram bot token not configured' });
  }

  try {
    // ✅ ПРАВИЛЬНЫЙ URL — без пробелов!
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

    // 📤 Логируем ответ от Telegram
    console.log('📤 Ответ от Telegram API:', {
      ok: response.ok,
      status: response.status,
      data: data,
    });

    if (!response.ok) {
      console.error('❌ Telegram API вернул ошибку:', data.description || data);
      return res.status(500).json({
        error: 'Failed to send message via Telegram',
        details: data.description || 'Unknown error',
      });
    }

    console.log('✅ Сообщение успешно отправлено в Telegram!');
    res.json({ success: true });

  } catch (error) {
    console.error('💥 Критическая ошибка при отправке сообщения:', error.message);
    res.status(500).json({ error: 'Internal server error', message: error.message });
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
