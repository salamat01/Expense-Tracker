
import React, { useState, useEffect } from 'react';
import type { Income } from '../types';
import { useData } from '../contexts/DataContext';
import EditIcon from '../components/icons/EditIcon';
import TrashIcon from '../components/icons/TrashIcon';
import CalculatorIcon from '../components/icons/CalculatorIcon';
import Calculator from '../components/Calculator';

const IncomePage: React.FC = () => {
  const { incomes, expenses, addIncome, updateIncome, deleteIncome } = useData();
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBalance = totalIncome - totalExpenses;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [editingIncome, setEditingIncome] = useState<Income | null>(null);
  const [isCalculatorVisible, setIsCalculatorVisible] = useState(false);

  useEffect(() => {
    if (editingIncome) {
      setTitle(editingIncome.title);
      setAmount(String(editingIncome.amount));
      setDate(editingIncome.date);
    }
  }, [editingIncome]);

  const handleCancelEdit = () => {
    setEditingIncome(null);
    setTitle('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && amount && date) {
      const incomeData = { title, amount: parseFloat(amount), date };
      if (editingIncome) {
        updateIncome(editingIncome.id, incomeData);
        handleCancelEdit();
      } else {
        addIncome(incomeData);
        setTitle('');
        setAmount('');
      }
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this income entry?')) {
      deleteIncome(id);
    }
  };
  
  const sortedIncomes = [...incomes].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <div className="space-y-8">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-emerald-500 to-teal-500 text-transparent bg-clip-text">Manage Income</h1>

        <div className="grid grid-cols-2 gap-4 text-center">
          <div className="bg-teal-50 dark:bg-teal-900/40 p-4 rounded-xl shadow-md transition-all duration-300">
            <h3 className="text-sm font-medium text-teal-700 dark:text-teal-300">Total Income</h3>
            <p className="text-2xl font-bold text-teal-800 dark:text-teal-200">{totalIncome.toLocaleString()} BDT</p>
          </div>
          <div className={`p-4 rounded-xl shadow-md transition-all duration-300 ${remainingBalance >= 0 ? 'bg-green-50 dark:bg-green-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
            <h3 className={`text-sm font-medium ${remainingBalance >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>Remaining Balance</h3>
            <p className={`text-2xl font-bold ${remainingBalance >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>{remainingBalance.toLocaleString()} BDT</p>
          </div>
        </div>
        
        <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
          <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-300">{editingIncome ? 'Edit Income' : 'Add New Income'}</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="income-title" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Income Title</label>
              <input
                id="income-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Monthly Salary"
                required
                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div>
              <label htmlFor="income-amount" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Amount (BDT)</label>
              <input
                id="income-amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>

            <div>
              <label htmlFor="income-date" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Date</label>
              <input
                id="income-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-accent focus:border-brand-accent"
              />
            </div>
            
            <div className="flex gap-4">
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-brand-accent to-emerald-500 hover:from-emerald-500 hover:to-brand-accent text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
              >
                {editingIncome ? 'Update Income' : 'Add Income'}
              </button>
              {editingIncome && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full bg-gray-500 hover:bg-gray-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
        
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Income History</h2>
          <div className="bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md p-4">
            {sortedIncomes.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-8">No income has been recorded yet.</p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {sortedIncomes.map(income => (
                  <li key={income.id} className="py-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{income.title}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(income.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <div className="text-right flex items-center space-x-2">
                       <p className="font-bold text-lg text-green-600 mr-2">
                         + {income.amount.toLocaleString()} BDT
                       </p>
                       <button onClick={() => setEditingIncome(income)} className="text-gray-500 dark:text-gray-400 hover:text-brand-accent transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700" aria-label={`Edit income: ${income.title}`}>
                         <EditIcon />
                       </button>
                       <button 
                         onClick={() => handleDelete(income.id)} 
                         className="text-gray-500 dark:text-gray-400 hover:text-brand-secondary transition-colors p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                         aria-label={`Delete income: ${income.title}`}
                       >
                          <TrashIcon />
                       </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={() => setIsCalculatorVisible(true)}
        className="fixed bottom-20 right-4 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-110 z-30"
        aria-label="Open calculator"
      >
        <CalculatorIcon />
      </button>
      {isCalculatorVisible && <Calculator onClose={() => setIsCalculatorVisible(false)} />}
    </>
  );
};

export default IncomePage;
