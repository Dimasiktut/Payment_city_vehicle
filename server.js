const express = require("express");
const path = require("path");
const fs = require("fs");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "frontend", "dist")));

const DB_FILE = "tickets.json";
let tickets = {};

// Загружаем сохранённые билеты
if (fs.existsSync(DB_FILE)) {
  tickets = JSON.parse(fs.readFileSync(DB_FILE));
}

function saveTickets() {
  fs.writeFileSync(DB_FILE, JSON.stringify(tickets, null, 2));
}

// Отправка сообщения боту
app.post("/api/sendMessage", async (req, res) => {
  const { chatId, text } = req.body;
  const BOT_TOKEN = process.env.BOT_TOKEN;

  if (!chatId || !text || !BOT_TOKEN) {
    return res.status(400).json({ description: "Недостаточно данных или BOT_TOKEN не задан" });
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "MarkdownV2"
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(500).json(data);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ description: "Ошибка при отправке сообщения", error: err.message });
  }
});

// Сохраняем билет в "базу"
app.post("/api/addTicket", (req, res) => {
  const { chatId, ticket } = req.body;
  if (!chatId || !ticket) {
    return res.status(400).json({ error: "chatId и ticket обязательны" });
  }

  if (!tickets[chatId]) tickets[chatId] = [];
  tickets[chatId].unshift(ticket);
  if (tickets[chatId].length > 10) tickets[chatId] = tickets[chatId].slice(0, 10);

  saveTickets();
  res.json({ success: true });
});

// React SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "dist", "index.html"));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`✅ Server started on ${PORT}`));
