
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import ListIcon from '../components/icons/ListIcon';

// Helper to get current date/time string in BST for input[type=datetime-local]
const getBstNowForInput = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    // Use 'en-CA' locale for a YYYY-MM-DD format, which is less ambiguous than other locales
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const parts = formatter.formatToParts(now).reduce((acc, part) => ({...acc, [part.type]: part.value}), {} as Record<Intl.DateTimeFormatPartTypes, string>);
    // Intl.DateTimeFormat can return '24' for the hour at midnight, which is invalid for inputs
    if (parts.hour === '24') parts.hour = '00';
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
};

// Helper to convert a UTC ISO string to a BST string for the datetime-local input
const convertUtcToBstForInput = (utcString: string) => {
    const date = new Date(utcString);
    const options: Intl.DateTimeFormatOptions = { timeZone: 'Asia/Dhaka', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    const formatter = new Intl.DateTimeFormat('en-CA', options);
    const parts = formatter.formatToParts(date).reduce((acc, part) => ({...acc, [part.type]: part.value}), {} as Record<Intl.DateTimeFormatPartTypes, string>);
    if (parts.hour === '24') parts.hour = '00';
    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}


const ExpensePage: React.FC = () => {
  const navigate = useNavigate();
  const { expenseId } = useParams<{ expenseId: string }>();
  const { segments, expenses, addExpense, updateExpense, incomes } = useData();

  const isEditMode = Boolean(expenseId);
  const totalIncome = incomes.reduce((sum, i) => sum + i.amount, 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const remainingBalance = totalIncome - totalExpenses;

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [dateTime, setDateTime] = useState(getBstNowForInput());
  const [segmentId, setSegmentId] = useState<string>('');
  
  useEffect(() => {
    if (isEditMode && expenseId) {
      const expenseToEdit = expenses.find(e => e.id === expenseId);
      if (expenseToEdit) {
        setTitle(expenseToEdit.title);
        setAmount(String(expenseToEdit.amount));
        setDateTime(convertUtcToBstForInput(expenseToEdit.dateTime));
        setSegmentId(expenseToEdit.segmentId);
      }
    } else {
        // Reset form for new expense or when navigating away from edit
        setTitle('');
        setAmount('');
        setDateTime(getBstNowForInput());
        if (segments.length > 0 && !segmentId) { // Set default segment only if not already set
            setSegmentId(segments[0].id);
        }
    }
  }, [isEditMode, expenseId, expenses, segments]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (title && amount && dateTime && segmentId) {
      // The dateTime string from the input is treated as BST.
      // Append the BST offset and convert to a standardized UTC ISO string for storage.
      const utcDateTime = new Date(`${dateTime}:00+06:00`).toISOString();
      const expenseData = { title, amount: parseFloat(amount), dateTime: utcDateTime, segmentId };

      if (isEditMode && expenseId) {
        updateExpense(expenseId, expenseData);
        navigate('/expenses-list');
      } else {
        addExpense(expenseData);
        setTitle('');
        setAmount('');
        setDateTime(getBstNowForInput()); // Reset time for next entry
      }
    }
  };

  if (segments.length === 0) {
    return (
      <div className="text-center p-8 bg-brand-surface dark:bg-gray-800 rounded-xl shadow-md">
        <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">No Segments Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">You must create a budget segment before you can add an expense.</p>
        <button 
          onClick={() => navigate('/segments')} 
          className="bg-brand-segment hover:bg-opacity-90 text-white font-bold py-2 px-6 rounded-lg transition-colors"
        >
          Create a Segment
        </button>
      </div>
    );
  }

  const expenseForm = (
    <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="expense-title" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Expense Title</label>
          <input
            id="expense-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Coffee"
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        <div>
          <label htmlFor="expense-amount" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Amount (BDT)</label>
          <input
            id="expense-amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        <div>
          <label htmlFor="expense-datetime" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Date and Time (BST)</label>
          <input
            id="expense-datetime"
            type="datetime-local"
            value={dateTime}
            onChange={(e) => setDateTime(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          />
        </div>
        <div>
          <label htmlFor="expense-segment" className="block text-sm font-medium text-gray-600 dark:text-gray-400">Segment</label>
          <select
            id="expense-segment"
            value={segmentId}
            onChange={(e) => setSegmentId(e.target.value)}
            required
            className="mt-1 block w-full bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 text-gray-900 dark:text-white focus:outline-none focus:ring-brand-secondary focus:border-brand-secondary"
          >
            {segments.map(segment => (
              <option key={segment.id} value={segment.id}>{segment.name}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-brand-secondary to-pink-500 hover:from-pink-500 hover:to-brand-secondary text-white font-bold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105"
        >
          {isEditMode ? 'Update Expense' : 'Add Expense'}
        </button>
      </form>
    </div>
  );

  if (isEditMode) {
    return (
      <div className="space-y-8 max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-red-600 to-pink-500 text-transparent bg-clip-text">
          Edit Expense
        </h1>
        {expenseForm}
        <div className="text-center">
          <button 
            onClick={() => navigate('/expenses-list')}
            className="inline-flex items-center justify-center bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded-lg transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-red-600 to-pink-500 text-transparent bg-clip-text">
          Add New Expense
        </h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Left Column */}
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-green-50 dark:bg-green-900/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square">
                <h3 className="text-sm font-medium text-green-700 dark:text-green-300 leading-tight">Total Income</h3>
                <p className="text-xl font-bold text-green-800 dark:text-green-200 mt-1">{totalIncome.toLocaleString()} BDT</p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/40 p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square">
                <h3 className="text-sm font-medium text-red-700 dark:text-red-300 leading-tight">Total Expenses</h3>
                <p className="text-xl font-bold text-red-800 dark:text-red-200 mt-1">{totalExpenses.toLocaleString()} BDT</p>
              </div>
              <div className={`p-3 rounded-xl shadow-md flex flex-col items-center justify-center aspect-square ${remainingBalance >= 0 ? 'bg-blue-50 dark:bg-blue-900/40' : 'bg-red-50 dark:bg-red-900/40'}`}>
                <h3 className={`text-sm font-medium leading-tight ${remainingBalance >= 0 ? 'text-blue-700 dark:text-blue-300' : 'text-red-700 dark:text-red-300'}`}>Remaining</h3>
                <p className={`text-xl font-bold mt-1 ${remainingBalance >= 0 ? 'text-blue-800 dark:text-blue-200' : 'text-red-800 dark:text-red-200'}`}>{remainingBalance.toLocaleString()} BDT</p>
              </div>
            </div>
          </div>

          {/* Right Column */}
          <div>
            {expenseForm}
          </div>
        </div>
      </div>
      <button
        onClick={() => navigate('/expenses-list')}
        className="fixed bottom-20 right-4 bg-brand-primary text-white p-4 rounded-full shadow-lg hover:bg-blue-600 transition-transform transform hover:scale-110 z-30"
        aria-label="View all expenses"
      >
        <ListIcon />
      </button>
    </>
  );
};

export default ExpensePage;
