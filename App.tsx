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

const App: React.FC = () => {
  const [selectedType, setSelectedType] = useState<string>('');
  const [selectedVehicleNumber, setSelectedVehicleNumber] = useState<string>('');
  const [history, setHistory] = useState<Transaction[]>([]);

  const processedTransactions: Transaction[] = useMemo(() => {
    return (rawTransactions as any[]).map((t): Transaction => {
      const routeMatch = t.vehicleType.match(/№(.*)/);
      const cleanRoute = routeMatch ? routeMatch[1] : t.vehicleType;
      return {
        id: String(t.id),
        dateTime: t.date_time,
        vehicleType: cleanRoute,
        vehicleNumber: String(t.vehicleNumber),
        amount: String(t.amount),
        link: t.link,
      };
    });
  }, []);

  const vehicleTypes = useMemo(() => {
    const types = new Set(processedTransactions.map(t => t.vehicleType));
    return Array.from(types).sort(naturalSort).map(type => ({ value: type, label: `Маршрут ${type}` }));
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

  useEffect(() => {
    if (selectedTransaction) {
      setHistory(prevHistory => {
        const otherItems = prevHistory.filter(item => item.id !== selectedTransaction.id);
        const newHistory = [selectedTransaction, ...otherItems];
        return newHistory.slice(0, 5); // Keep last 5 items
      });
    }
  }, [selectedTransaction]);

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
          <p className="text-slate-400 mt-2">Найдите платежную информацию для вашего маршрута.</p>
        </header>

        <main className="bg-slate-800/50 p-6 rounded-xl shadow-lg border border-slate-700 backdrop-blur-sm">
          <div className="flex flex-col space-y-6">
            <SelectInput
              label="Маршрут"
              value={selectedType}
              onChange={handleTypeChange}
              options={vehicleTypes}
              placeholder="-- Выберите маршрут --"
            />
            <SelectInput
              label="Номер транспорта"
              value={selectedVehicleNumber}
              onChange={handleVehicleChange}
              options={vehicleNumbersForType}
              placeholder={selectedType ? "-- Выберите номер --" : "-- Сначала выберите маршрут --"}
              disabled={!selectedType || vehicleNumbersForType.length === 0}
            />
          </div>
        </main>

        {selectedTransaction && <ResultCard transaction={selectedTransaction} />}

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
                        <p className="font-medium text-slate-200">Маршрут {ticket.vehicleType} &middot; ТС {ticket.vehicleNumber}</p>
                        <p className="text-sm text-slate-400">{ticket.amount} ₽ &middot; {new Date(ticket.dateTime).toLocaleString('ru-RU')}</p>
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