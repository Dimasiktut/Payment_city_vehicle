const express = require('express');
const fetch = require('node-fetch');
const path = require('path');

const app = express();

// Middleware для парсинга JSON
app.use(express.json());

// Обслуживание статических файлов (React-бандл)
app.use(express.static(path.join(__dirname, 'dist')));

// API эндпоинт для отправки сообщений в Telegram
app.post('/api/sendMessage', async (req, res) => {
  const { text, chatId } = req.body;

  // Получаем токен из Environment Variables Render
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

  if (!text || !chatId) {
    return res.status(400).send('В теле запроса отсутствуют "text" или "chatId".');
  }

  if (!BOT_TOKEN) {
    console.error('Токен Telegram-бота не настроен на сервере. Проверьте Environment Variables Render.');
    return res.status(500).send('Ошибка конфигурации сервера: отсутствует токен бота.');
  }

  const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'MarkdownV2',
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error('Ошибка API Telegram:', responseData);
      throw new Error(responseData.description);
    }

    res.status(200).json({ success: true, message: 'Сообщение успешно отправлено' });
  } catch (error) {
    console.error('Ошибка при отправке сообщения в Telegram:', error.message);
    res.status(500).send(`Не удалось отправить сообщение: ${error.message}`);
  }
});

// Все остальные GET-запросы вернут React-приложение
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Запуск сервера
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
});
