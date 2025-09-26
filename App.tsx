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

const sendToTelegram = async (transaction: Transaction, chatId: string | null) => {
  console.log('📤 [Frontend] Попытка отправить сообщение в Telegram');
  console.log('📤 [Frontend] chatId:', chatId);
  console.log('📤 [Frontend] transaction:', transaction);

  if (!chatId) {
    console.warn('⚠️ [Frontend] Chat ID не найден. Отправка пропущена.');
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

  const url = '/api/sendMessage';

  try {
    console.log('📤 [Frontend] Отправляю POST-запрос на:', url);
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

    console.log('📥 [Frontend] Ответ от бэкенда:', {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Frontend] Бэкенд вернул ошибку:', errorText);
      return;
    }

    const data = await response.json();
    console.log('✅ [Frontend] Успешный ответ от бэкенда:', data);

  } catch (error: any) {
    console.error('💥 [Frontend] Ошибка при отправке на бэкенд:', error.message, error);
  }
};

const App: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    if (window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();
      if (tg.initDataUnsafe?.user?.id) {
        const id = String(tg.initDataUnsafe.user.id);
        setChatId(id);
        console.log('✅ [Frontend] Получен chatId из Telegram WebApp:', id);
      } else {
        console.warn('⚠️ [Frontend] initDataUnsafe.user.id отсутствует. Пользователь не авторизован в боте.');
      }
    } else {
      console.warn('⚠️ [Frontend] Telegram WebApp не доступен. Запущено не в Telegram?');
    }
  }, []);

  const processedTransactions: Transaction[] = useMemo(() => {
    return (rawTransactions as any[]).map((t): Transaction => {
      return {
        id: String(t.id),
        dateTime: t.date_time,
        vehicleType: t.vehicleType,
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
