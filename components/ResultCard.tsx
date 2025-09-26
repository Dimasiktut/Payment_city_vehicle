import React from 'react';
import { Transaction } from '../types';
import { LinkIcon } from './icons';

interface ResultCardProps {
  transaction: Transaction;
  onSave: (transaction: Transaction) => void;
}

const ResultCard: React.FC<ResultCardProps> = ({ transaction, onSave }) => {
  return (
    <div className="w-full max-w-md bg-slate-800/80 backdrop-blur-sm rounded-xl shadow-2xl p-6 border border-slate-700 mt-8 animate-fade-in">
      <div className="flex flex-col space-y-4">
        <div>
          <h3 className="text-sm font-medium text-slate-400">Сумма к оплате</h3>
          <p className="text-4xl font-bold text-white tracking-tight">{transaction.amount} ₽</p>
          <p className="text-xs text-slate-500 mt-1">ID: {transaction.id}</p>
        </div>
        <div className="border-t border-slate-700 pt-4">
          <a
            href={transaction.link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => onSave(transaction)}
            className="flex items-center justify-center w-full px-4 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 focus:ring-cyan-500 transition-colors duration-200 shadow-lg shadow-cyan-600/20"
          >
            <LinkIcon className="w-5 h-5 mr-2" />
            Перейти к оплате
          </a>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
