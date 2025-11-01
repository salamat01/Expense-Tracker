
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import IncomePage from './pages/IncomePage';
import SegmentsPage from './pages/SegmentsPage';
import ExpensePage from './pages/ExpensePage';
import DashboardPage from './pages/DashboardPage';
import ExpenseListPage from './pages/ExpenseListPage';
import ProtectedRoute from './components/ProtectedRoute';
import AccountPage from './pages/AccountPage';
import { useData } from './contexts/DataContext';

const App: React.FC = () => {
  const { isOnline, isSyncing, incomes, expenses, segments, addExpense, updateExpense, deleteExpense, addIncome, updateIncome, deleteIncome, addSegment, updateSegment, deleteSegment } = useData();

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBalance = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header />
      <main className="flex-grow overflow-y-auto pb-20 pt-14 bg-brand-bg dark:bg-gray-900">
        <div className="container mx-auto p-4 max-w-2xl">
          <Routes>
            <Route path="/account" element={<AccountPage />} />

            <Route path="/" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
            <Route path="/edit-expense/:expenseId" element={<ProtectedRoute><ExpensePage /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><IncomePage /></ProtectedRoute>} />
            <Route path="/segments" element={<ProtectedRoute><SegmentsPage /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="/expenses-list" element={<ProtectedRoute><ExpenseListPage /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default App;
