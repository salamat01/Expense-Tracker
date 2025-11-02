
import React from 'react';
import { Routes, Route } from 'react-router-dom';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import IncomePage from './pages/IncomePage';
import SegmentsPage from './pages/SegmentsPage';
import ExpensePage from './pages/ExpensePage';
import ExpenseListPage from './pages/ExpenseListPage';
import DashboardPage from './pages/DashboardPage';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-screen font-sans">
      <Header />
      <main className="flex-grow overflow-y-auto pb-20 pt-14 bg-brand-bg dark:bg-gray-900">
        <div className="container mx-auto p-4 max-w-2xl">
          <Routes>
            <Route path="/" element={<ExpensePage />} />
            <Route path="/expense" element={<ExpensePage />} />
            <Route path="/edit-expense/:expenseId" element={<ExpensePage />} />
            <Route path="/income" element={<IncomePage />} />
            <Route path="/segments" element={<SegmentsPage />} />
            <Route path="/expenses-list" element={<ExpenseListPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default App;