import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Income, Expense, Segment } from './types';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import IncomePage from './pages/IncomePage';
import SegmentsPage from './pages/SegmentsPage';
import ExpensePage from './pages/ExpensePage';
import DashboardPage from './pages/DashboardPage';
import ExpenseListPage from './pages/ExpenseListPage';

// Helper function to safely parse JSON from localStorage
// By declaring it as a standard function, we avoid any TSX parsing ambiguity
// with generic arrow functions, which was causing the app to crash.
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
    // If parsing fails, remove the corrupted item to prevent future errors
    localStorage.removeItem(key);
  }
  return defaultValue;
}

const App: React.FC = () => {
  const [incomes, setIncomes] = useState<Income[]>(() => loadFromLocalStorage('incomes', []));
  const [expenses, setExpenses] = useState<Expense[]>(() => loadFromLocalStorage('expenses', []));
  const [segments, setSegments] = useState<Segment[]>(() => loadFromLocalStorage('segments', []));

  useEffect(() => {
    localStorage.setItem('incomes', JSON.stringify(incomes));
  }, [incomes]);

  useEffect(() => {
    localStorage.setItem('expenses', JSON.stringify(expenses));
  }, [expenses]);

  useEffect(() => {
    localStorage.setItem('segments', JSON.stringify(segments));
  }, [segments]);

  const addIncome = (income: Omit<Income, 'id'>) => {
    setIncomes(prev => [...prev, { ...income, id: Date.now().toString() }]);
  };

  const updateIncome = (id: string, updatedIncome: Omit<Income, 'id'>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...updatedIncome, id } : i));
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    setExpenses(prev => [...prev, { ...expense, id: Date.now().toString() }]);
  };

  const updateExpense = (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...updatedExpense, id } : e));
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addSegment = (segment: Omit<Segment, 'id'>) => {
    setSegments(prev => [...prev, { ...segment, id: Date.now().toString() }]);
  };

  const updateSegment = (id: string, updatedSegment: Omit<Segment, 'id'>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...updatedSegment, id } : s));
  };

  const deleteSegment = (id: string) => {
    const isSegmentInUse = expenses.some(e => e.segmentId === id);
    if (isSegmentInUse) {
      alert('This segment cannot be deleted because it is associated with one or more expenses.');
      return;
    }
    setSegments(prev => prev.filter(s => s.id !== id));
  }

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBalance = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header />
      <main className="flex-grow overflow-y-auto pb-20 pt-14 bg-brand-bg dark:bg-gray-900">
        <div className="container mx-auto p-4 max-w-2xl">
          <Routes>
            <Route path="/" element={<ExpensePage segments={segments} addExpense={addExpense} expenses={expenses} updateExpense={updateExpense} totalIncome={totalIncome} totalExpenses={totalExpenses} />} />
            <Route path="/edit-expense/:expenseId" element={<ExpensePage segments={segments} addExpense={addExpense} expenses={expenses} updateExpense={updateExpense} totalIncome={totalIncome} totalExpenses={totalExpenses} />} />
            <Route path="/income" element={<IncomePage addIncome={addIncome} deleteIncome={deleteIncome} incomes={incomes} totalIncome={totalIncome} remainingBalance={remainingBalance} updateIncome={updateIncome} />} />
            <Route path="/segments" element={<SegmentsPage segments={segments} addSegment={addSegment} deleteSegment={deleteSegment} expenses={expenses} totalIncome={totalIncome} updateSegment={updateSegment}/>} />
            <Route path="/dashboard" element={<DashboardPage incomes={incomes} expenses={expenses} segments={segments} />} />
            <Route path="/expenses-list" element={<ExpenseListPage expenses={expenses} segments={segments} deleteExpense={deleteExpense} />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default App;