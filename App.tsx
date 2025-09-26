import React, { useState, useMemo, useEffect } from 'react';
import { transactions as rawTransactions } from './services/data';
import type { Transaction } from './types';
import SelectInput from './components/SelectInput';
import ResultCard from './components/ResultCard';
import { TicketIcon, HistoryIcon } from './components/icons';

const naturalSort = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

const App: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);
  const [chatId, setChatId] = useState<string | null>(null);

  // Получаем chatId из Telegram WebApp
  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (!tg) return console.warn('Telegram WebApp недоступен');

    tg.ready();
    tg.expand();
    const userId = tg.initDataUnsafe?.user?.id;
    if (userId) setChatId(String(userId));
  }, []);

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
      processedTransactions.filter(t => t.vehicleType === selectedType).map(t => t.vehicleNumber)
    );
    return Array.from(numbers).sort(naturalSort).map(num => ({ value: num, label: num }));
  }, [selectedType, processedTransactions]);

  const selectedTransaction = useMemo(() => {
    if (!selectedType || !selectedVehicleNumber) return null;
    const candidates = processedTransactions.filter(
      t => t.vehicleType === selectedType && t.vehicleNumber === selectedVehicleNumber
    );
    if (!candidates.length) return null;
    candidates.sort((a, b) => new Date(b.dateTime).getTime() - new Date(a.dateTime).getTime());
    return candidates[0];
  }, [selectedType, selectedVehicleNumber, processedTransactions]);

  // Отправка сообщения боту
  const handleSendToBot = async (transaction: Transaction) => {
    if (!chatId) return alert('Telegram WebApp недоступен или пользователь не авторизован');

    const escapeMarkdownV2 = (text: string) => {
      const specials = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
      // Fix: Replace `replaceAll` with `split` and `join` for wider compatibility.
      return specials.reduce((acc, char) => acc.split(char).join(`\\${char}`), text);
    };

    const message = `
*Новый билет оплачен* 🎫
*Транспорт:* ${escapeMarkdownV2(transaction.vehicleType)}
*Номер ТС:* ${escapeMarkdownV2(transaction.vehicleNumber)}
*Сумма:* ${escapeMarkdownV2(transaction.amount)} ₽
*ID транзакции:* \`${escapeMarkdownV2(transaction.id)}\`
[Ссылка на оплату](${transaction.link})
    `;

    try {
      const res = await fetch('/api/sendMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, text: message }),
      });

      const data = await res.json();
      if (res.ok) alert('✅ Сообщение успешно отправлено боту!');
      else alert('❌ Ошибка: ' + (data.description || JSON.stringify(data)));
    } catch (err) {
      console.error(err);
      alert('❌ Ошибка при отправке сообщения');
    }
  };

  const handleSaveToHistory = (transaction: Transaction) => {
    if (chatId) handleSendToBot(transaction);

    const transactionWithCurrentDate = { ...transaction, dateTime: new Date().toISOString() };
    setHistory(prev => [transactionWithCurrentDate, ...prev.filter(t => t.id !== transaction.id)].slice(0, 5));
  };

  return (
    <div className="min-h-screen text-white flex flex-col items-center justify-center p-4 selection:bg-cyan-500/30">
      <div className="w-full max-w-md mx-auto">
        <header className="text-center mb-8">
          <div className="inline-flex justify-center items-center gap-4 mb-4 bg-slate-900/60 p-4 rounded-full border border-white/10 backdrop-blur-lg">
            <TicketIcon className="w-10 h-10 text-cyan-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">Оплата транспорта</h1>
          <p className="text-slate-400 mt-2">Найдите платежную информацию для вашего транспорта.</p>
        </header>

        <main className="bg-slate-900/60 p-6 rounded-xl shadow-lg border border-white/10 backdrop-blur-lg">
          <div className="flex flex-col space-y-6">
            <SelectInput
              label="Тип транспорта"
              value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setSelectedVehicleNumber(''); }}
              options={vehicleTypes}
              placeholder="-- Выберите транспорт --"
            />
            <SelectInput
              label="Номер транспорта"
              value={selectedVehicleNumber}
              onChange={e => setSelectedVehicleNumber(e.target.value)}
              options={vehicleNumbersForType}
              placeholder={selectedType ? "-- Выберите номер --" : "-- Сначала выберите транспорт --"}
              disabled={!selectedType || vehicleNumbersForType.length === 0}
            />
          </div>
        </main>

        {selectedTransaction && (
          <ResultCard
            transaction={selectedTransaction}
            onSave={handleSaveToHistory}
          />
        )}

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
                  onClick={() => { setSelectedType(ticket.vehicleType); setSelectedVehicleNumber(ticket.vehicleNumber); }}
                  className="w-full text-left p-3 bg-slate-900/60 border border-white/10 rounded-lg hover:bg-slate-800/60 backdrop-blur-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <p className="font-medium text-slate-200">{ticket.vehicleType} &middot; ТС {ticket.vehicleNumber}</p>
                  <p className="text-sm text-slate-400">
                    ID: {ticket.id} &middot; {ticket.amount} ₽ &middot; {new Date(ticket.dateTime).toLocaleString('ru-RU')}
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
