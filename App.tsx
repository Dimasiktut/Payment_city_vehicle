import React, { useState, useMemo, useEffect } from 'react';
import { transactions as rawTransactions } from './services/data';
import type { Transaction } from './types';
import SelectInput from './components/SelectInput';
import ResultCard from './components/ResultCard';
import { BusIcon, HistoryIcon } from './components/icons';

// Natural sort for alphanumeric strings (e.g., '10A', '2', '10')
const naturalSort = (a: string, b: string) => {
    return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
};

// --- ИНФОРМАЦИЯ О БЕЗОПАСНОСТИ ---
// Прямая отправка сообщений из фронтенд-кода (браузера) небезопасна,
// так как ваш токен бота будет виден всем пользователям.
//
// Я изменил код так, чтобы он отправлял запрос на ваш бэкенд-сервер
// по адресу '/api/sendMessage'. Вам необходимо самостоятельно
// реализовать этот эндпоинт на вашем сервере.
//
// Пример реализации на Node.js + Express:
//
// const express = require('express');
// const fetch = require('node-fetch'); // Установите: npm install node-fetch
// const app = express();
// app.use(express.json());
//
// app.post('/api/sendMessage', async (req, res) => {
//   const { text, chatId } = req.body;
//   // Храните токен в переменных окружения на сервере, а не в коде!
//   const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
//
//   if (!BOT_TOKEN) {
//     console.error('Telegram Bot Token is not configured on the server.');
//     return res.status(500).send('Server configuration error');
//   }
//
//   const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
//
//   try {
//     const response = await fetch(url, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({
//         chat_id: chatId,
//         text: text,
//         parse_mode: 'MarkdownV2',
//       }),
//     });
//
//     if (!response.ok) {
//       throw new Error('Failed to send message to Telegram');
//     }
//
//     res.status(200).send('Message sent successfully');
//   } catch (error) {
//     console.error('Error sending message to Telegram:', error);
//     res.status(500).send('Failed to send message');
//   }
// });
//
// app.listen(3001, () => console.log('Server running on port 3001'));
// ------------------------------------
const sendToTelegram = async (transaction: Transaction, chatId: string | null) => {
    if (!chatId) {
        console.warn('Chat ID не найден. Отправка сообщения пропущена.');
        return;
    }

    const escapeMarkdown = (text: string) => {
        const specials = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
        return specials.reduce((acc, char) => acc.replace(new RegExp('\\' + char, 'g'), '\\' + char), text);
    };

    const message = `
*Новый билет оплачен* 🎫

*Транспорт:* ${escapeMarkdown(transaction.vehicleType)}
*Номер ТС:* ${escapeMarkdown(transaction.vehicleNumber)}
*Сумма:* ${escapeMarkdown(transaction.amount)} ₽
*ID транзакции:* \`${escapeMarkdown(transaction.id)}\`

[Ссылка на оплату](${transaction.link})
    `;

    // Отправляем данные на наш бэкенд, а не напрямую в Telegram
    const url = '/api/sendMessage';

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                chatId: chatId,
                text: message,
            }),
        });

        if (!response.ok) {
            console.error('Не удалось отправить сообщение через бэкенд.');
        }
    } catch (error) {
        console.error('Ошибка при отправке сообщения на бэкенд:', error);
    }
};


const App: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  // Получаем данные пользователя и разворачиваем приложение
  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user?.id) {
        setChatId(String(tg.initDataUnsafe.user.id));
      }
    }
  }, []);

  const processedTransactions: Transaction[] = useMemo(() => {
    return (rawTransactions as any[]).map((t): Transaction => {
      return {
        id: String(t.id),
        dateTime: t.date_time,
        vehicleType: t.vehicleType, // оставляем без изменений
        vehicleNumber: String(t.vehicleNumber),
        amount: String(t.amount),
        link: t.link,
      };
    });
  }, []);

  const vehicleTypes = useMemo(() => {
    const types = new Set(processedTransactions.map(t => t.vehicleType));
    return Array.from(types).sort(naturalSort).map(type => ({ value: type, label: type }));
  }, [processedTransactions]);

  const vehicleNumbersForType = useMemo(() => {
    if (!selectedType) return [];
    const numbers = new Set(
      processedTransactions
        .filter(t => t.vehicleType === selectedType)
        .map(t => t.vehicleNumber)
    );
    return Array.from(numbers).sort(naturalSort).map(num => ({ value: num, label: num }));
  }, [selectedType, processedTransactions]);

  const selectedTransaction = useMemo(() => {
    if (!selectedType || !selectedVehicleNumber) return null;
    const candidates = processedTransactions.filter(
      t => t.vehicleType === selectedType && t.vehicleNumber === selectedVehicleNumber
    );
    if (candidates.length === 0) return null;
    candidates.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    return candidates[0];
  }, [selectedType, selectedVehicleNumber, processedTransactions]);

  const handleSaveToHistory = (transactionToSave: Transaction) => {
    // Отправляем уведомление в Telegram текущему пользователю
    if (chatId) {
        sendToTelegram(transactionToSave, chatId);
    }

    const transactionWithCurrentDate = {
      ...transactionToSave,
      dateTime: new Date().toISOString(),
    };
    setHistory(prevHistory => {
      const otherItems = prevHistory.filter(item => item.id !== transactionWithCurrentDate.id);
      const newHistory = [transactionWithCurrentDate, ...otherItems];
      return newHistory.slice(0, 5); // Keep last 5 items
    });
  };

  const handleTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedType(e.target.value);
    setSelectedVehicleNumber('');
  };

  const handleVehicleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedVehicleNumber(e.target.value);
  };
  
  const handleHistoryClick = (transaction: Transaction) => {
    setSelectedType(transaction.vehicleType);
    setSelectedVehicleNumber(transaction.vehicleNumber);
  }

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex justify-center items-center gap-4 mb-4 bg-slate-800/50 p-4 rounded-full border border-slate-700">
            <BusIcon className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Оплата транспорта</h1>
          <p className="text-slate-400 mt-2">Найдите платежную информацию для вашего транспорта.</p>
        </header>

        <main className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm">
          <div className="flex flex-col space-y-6">
            <SelectInput
              label="Тип транспорта"
              value={selectedType}
              onChange={handleTypeChange}
              options={vehicleTypes}
              placeholder="-- Выберите транспорт --"
            />
            <SelectInput
              label="Номер транспорта"
              value={selectedVehicleNumber}
              onChange={handleVehicleChange}
              options={vehicleNumbersForType}
              placeholder={selectedType ? "-- Выберите номер --" : "-- Сначала выберите транспорт --"}
              disabled={!selectedType || vehicleNumbersForType.length === 0}
            />
          </div>
        </main>

        {selectedTransaction && <ResultCard transaction={selectedTransaction} onSave={handleSaveToHistory} />}

        {history.length > 0 && (
          <div className="w-full max-w-md mt-8">
            <h2 className="flex items-center text-lg font-semibold text-slate-300 mb-3">
              <HistoryIcon className="w-5 h-5 mr-2 text-slate-400" />
              История билетов
            </h2>
            <div className="space-y-2">
                {history.map(ticket => (
                    <button 
                        key={ticket.id}
                        onClick={() => handleHistoryClick(ticket)}
                        className="w-full text-left p-3 bg-slate-800/50 border border-slate-700 rounded-lg hover:bg-slate-700/50 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    >
                        <p className="font-medium text-slate-200">{ticket.vehicleType} &middot; ТС {ticket.vehicleNumber}</p>
                        <p className="text-sm text-slate-400">ID: {ticket.id} &middot; {ticket.amount} ₽ &middot; {new Date(ticket.dateTime).toLocaleString('ru-RU')}</p>
                    </button>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;