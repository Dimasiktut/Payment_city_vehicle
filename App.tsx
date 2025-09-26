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

// Отправка сообщения в Telegram через WebApp
const sendToTelegram = async (transaction: Transaction, chatId: string | null) => {
  if (!chatId) {
    console.warn('⚠️ Chat ID отсутствует. Сообщение не отправлено.');
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

  try {
    console.log('📤 Отправка сообщения в Telegram WebApp...');
    const response = await fetch('/api/sendMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chatId, text: message })
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (errorText.includes('CHANNEL_PRIVATE')) {
        alert('⚠️ Невозможно отправить сообщение: приватный канал. Проверьте доступ.');
        console.warn('Попытка отправки в приватный канал. Доступ запрещён.');
      } else {
        console.error('❌ Ошибка при отправке сообщения:', errorText);
        alert('❌ Ошибка при отправке сообщения. Попробуйте позже.');
      }
      return;
    }

    const data = await response.json();
    console.log('✅ Сообщение успешно отправлено:', data);

  } catch (err: any) {
    console.error('💥 Ошибка при отправке сообщения:', err.message);
    alert('❌ Ошибка отправки сообщения. Попробуйте позже.');
  }
};

const App: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  // Инициализация Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) {
      console.warn('⚠️ Telegram WebApp не доступен. Функция отправки сообщений будет отключена.');
      return;
    }

    tg.ready();
    tg.expand();

    const userId = tg.initDataUnsafe?.user?.id;
    if (userId) {
      setChatId(String(userId));
      console.log('✅ chatId получен:', userId);
    } else {
      console.warn('⚠️ Пользователь не авторизован в боте. chatId отсутствует.');
    }
  }, []);

  // Обработка исходных транзакций
  const processedTransactions: Transaction[] = useMemo(() => {
    return (rawTransactions as any[]).map((t): Transaction => ({
      id: String(t.id),
      dateTime: t.date_time,
      vehicleType: t.vehicleType,
      vehicleNumber: String(t.vehicleNumber),
      amount: String(t.amount),
      link: t.link,
    }));
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

  // Сохранение истории и отправка сообщения
  const handleSaveToHistory = (transactionToSave: Transaction) => {
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
      return newHistory.slice(0, 5);
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
  };

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
                  <p className="text-sm text-slate-400">
                    ID: {ticket.id} &middot; {ticket.amount} ₽ &middot;{' '}
                    {new Date(ticket.dateTime).toLocaleString('ru-RU')}
                  </p>
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
