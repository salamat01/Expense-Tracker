import React, { useState, useEffect, useCallback } from 'react';
import { Routes, Route } from 'react-router-dom';
import type { Income, Expense, Segment, SyncAction } from './types';
import BottomNav from './components/BottomNav';
import Header from './components/Header';
import IncomePage from './pages/IncomePage';
import SegmentsPage from './pages/SegmentsPage';
import ExpensePage from './pages/ExpensePage';
import DashboardPage from './pages/DashboardPage';
import ExpenseListPage from './pages/ExpenseListPage';
import { useAuth } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AccountPage from './pages/AccountPage';

// Helper function to safely parse JSON from localStorage
function loadFromLocalStorage<T>(key: string, defaultValue: T): T {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error(`Failed to parse ${key} from localStorage`, error);
    localStorage.removeItem(key);
  }
  return defaultValue;
}

const App: React.FC = () => {
  const { currentUser } = useAuth();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  // State for sync functionality
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncQueue, setSyncQueue] = useState<SyncAction[]>([]);

  const incomesKey = currentUser ? `incomes_${currentUser.id}` : null;
  const expensesKey = currentUser ? `expenses_${currentUser.id}` : null;
  const segmentsKey = currentUser ? `segments_${currentUser.id}` : null;
  const syncQueueKey = currentUser ? `syncQueue_${currentUser.id}` : null;

  // Effect to handle online/offline status changes
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Load data and sync queue when user changes
  useEffect(() => {
    if (currentUser && incomesKey && expensesKey && segmentsKey && syncQueueKey) {
      setIncomes(loadFromLocalStorage(incomesKey, []));
      setExpenses(loadFromLocalStorage(expensesKey, []));
      setSegments(loadFromLocalStorage(segmentsKey, []));
      setSyncQueue(loadFromLocalStorage(syncQueueKey, []));
    } else {
      // Clear data if user logs out
      setIncomes([]);
      setExpenses([]);
      setSegments([]);
      setSyncQueue([]);
    }
  }, [currentUser, incomesKey, expensesKey, segmentsKey, syncQueueKey]);

  // Save data to localStorage when it changes
  useEffect(() => { if (incomesKey) localStorage.setItem(incomesKey, JSON.stringify(incomes)); }, [incomes, incomesKey]);
  useEffect(() => { if (expensesKey) localStorage.setItem(expensesKey, JSON.stringify(expenses)); }, [expenses, expensesKey]);
  useEffect(() => { if (segmentsKey) localStorage.setItem(segmentsKey, JSON.stringify(segments)); }, [segments, segmentsKey]);
  useEffect(() => { if (syncQueueKey) localStorage.setItem(syncQueueKey, JSON.stringify(syncQueue)); }, [syncQueue, syncQueueKey]);
  
  // The main sync processing logic
  const processSyncQueue = useCallback(async () => {
    if (syncQueue.length === 0 || isSyncing) return;

    setIsSyncing(true);
    console.log(`Starting sync for ${syncQueue.length} item(s).`);

    // Simulate a single network request for the entire queue
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // In a real app, you would process each action and handle errors.
    // For this mock, we assume success and clear the queue.
    console.log('Sync completed successfully.');
    setSyncQueue([]);
    setIsSyncing(false);

  }, [syncQueue, isSyncing]);

  // Effect to trigger sync when coming online
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processSyncQueue();
    }
  }, [isOnline, syncQueue.length, processSyncQueue]);

  // Helper to add actions to the queue if offline
  const addToSyncQueue = (action: Omit<SyncAction, 'id'>) => {
    if (!isOnline) {
      const newAction: SyncAction = { ...action, id: Date.now().toString() };
      setSyncQueue(prev => [...prev, newAction]);
    }
  };
  
  // --- Refactored CRUD operations for offline support ---
  const addIncome = (income: Omit<Income, 'id'>) => {
    const newIncome = { ...income, id: Date.now().toString() };
    setIncomes(prev => [...prev, newIncome]);
    addToSyncQueue({ type: 'add', dataType: 'income', payload: newIncome });
  };

  const updateIncome = (id: string, updatedIncome: Omit<Income, 'id'>) => {
    setIncomes(prev => prev.map(i => i.id === id ? { ...updatedIncome, id } : i));
    addToSyncQueue({ type: 'update', dataType: 'income', payload: { ...updatedIncome, id } });
  };

  const deleteIncome = (id: string) => {
    setIncomes(prev => prev.filter(i => i.id !== id));
    addToSyncQueue({ type: 'delete', dataType: 'income', payload: { id } });
  };

  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    setExpenses(prev => [...prev, newExpense]);
    addToSyncQueue({ type: 'add', dataType: 'expense', payload: newExpense });
  };

  const updateExpense = (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...updatedExpense, id } : e));
    addToSyncQueue({ type: 'update', dataType: 'expense', payload: { ...updatedExpense, id } });
  };

  const deleteExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
    addToSyncQueue({ type: 'delete', dataType: 'expense', payload: { id } });
  };

  const addSegment = (segment: Omit<Segment, 'id'>) => {
    const newSegment = { ...segment, id: Date.now().toString() };
    setSegments(prev => [...prev, newSegment]);
    addToSyncQueue({ type: 'add', dataType: 'segment', payload: newSegment });
  };

  const updateSegment = (id: string, updatedSegment: Omit<Segment, 'id'>) => {
    setSegments(prev => prev.map(s => s.id === id ? { ...updatedSegment, id } : s));
    addToSyncQueue({ type: 'update', dataType: 'segment', payload: { ...updatedSegment, id } });
  };

  const deleteSegment = (id: string) => {
    const isSegmentInUse = expenses.some(e => e.segmentId === id);
    if (isSegmentInUse) {
      alert('This segment cannot be deleted because it is associated with one or more expenses.');
      return;
    }
    setSegments(prev => prev.filter(s => s.id !== id));
    addToSyncQueue({ type: 'delete', dataType: 'segment', payload: { id } });
  }

  const totalIncome = incomes.reduce((sum, income) => sum + income.amount, 0);
  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);
  const remainingBalance = totalIncome - totalExpenses;

  return (
    <div className="flex flex-col h-screen font-sans">
      <Header isOnline={isOnline} isSyncing={isSyncing} />
      <main className="flex-grow overflow-y-auto pb-20 pt-14 bg-brand-bg dark:bg-gray-900">
        <div className="container mx-auto p-4 max-w-2xl">
          <Routes>
            <Route path="/account" element={<AccountPage />} />

            <Route path="/" element={<ProtectedRoute><ExpensePage segments={segments} addExpense={addExpense} expenses={expenses} updateExpense={updateExpense} totalIncome={totalIncome} totalExpenses={totalExpenses} /></ProtectedRoute>} />
            <Route path="/edit-expense/:expenseId" element={<ProtectedRoute><ExpensePage segments={segments} addExpense={addExpense} expenses={expenses} updateExpense={updateExpense} totalIncome={totalIncome} totalExpenses={totalExpenses} /></ProtectedRoute>} />
            <Route path="/income" element={<ProtectedRoute><IncomePage addIncome={addIncome} deleteIncome={deleteIncome} incomes={incomes} totalIncome={totalIncome} remainingBalance={remainingBalance} updateIncome={updateIncome} /></ProtectedRoute>} />
            <Route path="/segments" element={<ProtectedRoute><SegmentsPage segments={segments} addSegment={addSegment} deleteSegment={deleteSegment} expenses={expenses} totalIncome={totalIncome} updateSegment={updateSegment}/></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage incomes={incomes} expenses={expenses} segments={segments} /></ProtectedRoute>} />
            <Route path="/expenses-list" element={<ProtectedRoute><ExpenseListPage expenses={expenses} segments={segments} deleteExpense={deleteExpense} /></ProtectedRoute>} />
          </Routes>
        </div>
      </main>
      <BottomNav />
    </div>
  );
};

export default App;