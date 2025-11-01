
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Income, Expense, Segment, SyncAction, AppData } from '../types';
import { useAuth } from './AuthContext';

// --- Mock Google Drive API ---
const GDRIVE_API_DELAY = 1500; // ms

const gdriveApi = {
  // Simulates creating a folder and file in Google Drive
  async saveData(userId: string, data: AppData): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        const gdriveKey = `gdrive_mock_${userId}`;
        console.log(`[GDRIVE] Saving data to Drive for user ${userId}...`);
        localStorage.setItem(gdriveKey, JSON.stringify(data));
        console.log('[GDRIVE] Save successful.');
        resolve();
      }, GDRIVE_API_DELAY);
    });
  },

  // Simulates fetching data from the file in Google Drive
  async fetchData(userId: string): Promise<AppData | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const gdriveKey = `gdrive_mock_${userId}`;
        console.log(`[GDRIVE] Fetching data from Drive for user ${userId}...`);
        const savedData = localStorage.getItem(gdriveKey);
        if (savedData) {
          console.log('[GDRIVE] Data found.');
          resolve(JSON.parse(savedData));
        } else {
          console.log('[GDRIVE] No data found for this user in Drive.');
          resolve(null);
        }
      }, GDRIVE_API_DELAY);
    });
  }
};
// --- End Mock API ---


interface DataContextType {
  incomes: Income[];
  expenses: Expense[];
  segments: Segment[];
  addIncome: (income: Omit<Income, 'id'>) => void;
  updateIncome: (id: string, updatedIncome: Omit<Income, 'id'>) => void;
  deleteIncome: (id: string) => void;
  addExpense: (expense: Omit<Expense, 'id'>) => void;
  updateExpense: (id: string, updatedExpense: Omit<Expense, 'id'>) => void;
  deleteExpense: (id: string) => void;
  addSegment: (segment: Omit<Segment, 'id'>) => void;
  updateSegment: (id: string, updatedSegment: Omit<Segment, 'id'>) => void;
  deleteSegment: (id: string) => void;
  isOnline: boolean;
  isSyncing: boolean;
  isLoading: boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// Helper to get data from local storage
const getLocalData = <T,>(key: string, fallback: T) => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : fallback;
    } catch (e) {
        return fallback;
    }
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const localDataKey = currentUser ? `localData_${currentUser.id}` : null;
  const syncQueueKey = currentUser ? `syncQueue_${currentUser.id}` : null;

  // Load initial data and handle user changes
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || !localDataKey) {
        setIncomes([]);
        setExpenses([]);
        setSegments([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      
      // Try fetching from "Google Drive" first
      const driveData = await gdriveApi.fetchData(currentUser.id);
      
      if (driveData) {
        setIncomes(driveData.incomes);
        setExpenses(driveData.expenses);
        setSegments(driveData.segments);
        localStorage.setItem(localDataKey, JSON.stringify(driveData));
      } else {
        // Fallback to local data if Drive is empty (e.g., first-time user on this device)
        const local = getLocalData<AppData | null>(localDataKey, null);
        if (local) {
          setIncomes(local.incomes);
          setExpenses(local.expenses);
          setSegments(local.segments);
        }
      }
      setIsLoading(false);
    };

    loadData();
  }, [currentUser, localDataKey]);


  // Effect for online/offline status
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
  
  // The main sync processing logic
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing || !currentUser || !syncQueueKey) return;
    
    const queue = getLocalData<SyncAction[]>(syncQueueKey, []);
    if (queue.length === 0) return;

    setIsSyncing(true);
    console.log(`[SYNC] Starting sync for ${queue.length} item(s).`);

    // 1. Fetch latest data from Drive to avoid overwriting changes from other devices
    let currentDriveData = await gdriveApi.fetchData(currentUser.id) || { incomes: [], expenses: [], segments: [] };
    
    // 2. Apply queued changes
    queue.forEach(action => {
      console.log(`[SYNC] Processing action: ${action.type} ${action.dataType}`);
      const { dataType, type, payload } = action;
      let dataArray;
      switch(dataType) {
        case 'income': dataArray = currentDriveData.incomes; break;
        case 'expense': dataArray = currentDriveData.expenses; break;
        case 'segment': dataArray = currentDriveData.segments; break;
      }
      
      if (type === 'add') {
        dataArray.push(payload);
      } else if (type === 'update') {
        const index = dataArray.findIndex(item => item.id === payload.id);
        if (index > -1) dataArray[index] = payload;
        else dataArray.push(payload); // If not found, add it
      } else if (type === 'delete') {
        const index = dataArray.findIndex(item => item.id === payload.id);
        if (index > -1) dataArray.splice(index, 1);
      }
    });

    // 3. Save merged data back to Drive
    await gdriveApi.saveData(currentUser.id, currentDriveData);

    // 4. Update local state with the synced data
    setIncomes(currentDriveData.incomes);
    setExpenses(currentDriveData.expenses);
    setSegments(currentDriveData.segments);
    
    // 5. Clear the sync queue
    localStorage.removeItem(syncQueueKey);
    
    console.log('[SYNC] Sync completed successfully.');
    setIsSyncing(false);
  }, [isOnline, isSyncing, currentUser, syncQueueKey]);

  // Effect to trigger sync when coming online
  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue]);

  // Helper for all state updates
  const updateStateAndSync = useCallback((updateFn: (prev: AppData) => AppData, syncAction: Omit<SyncAction, 'id'>) => {
    if (!localDataKey || !currentUser) return;
    
    const appData = { incomes, expenses, segments };
    const newState = updateFn(appData);

    setIncomes(newState.incomes);
    setExpenses(newState.expenses);
    setSegments(newState.segments);
    localStorage.setItem(localDataKey, JSON.stringify(newState));

    if (isOnline) {
      // If online, save directly to Drive
      gdriveApi.saveData(currentUser.id, newState);
    } else {
      // If offline, add to queue
      if(syncQueueKey) {
        const queue = getLocalData<SyncAction[]>(syncQueueKey, []);
        queue.push({ ...syncAction, id: Date.now().toString() });
        localStorage.setItem(syncQueueKey, JSON.stringify(queue));
      }
    }
  }, [incomes, expenses, segments, isOnline, currentUser, localDataKey, syncQueueKey]);

  // CRUD Functions
  const addIncome = (income: Omit<Income, 'id'>) => {
    const newIncome = { ...income, id: Date.now().toString() };
    updateStateAndSync(
      prev => ({ ...prev, incomes: [...prev.incomes, newIncome] }),
      { type: 'add', dataType: 'income', payload: newIncome }
    );
  };

  const updateIncome = (id: string, updatedIncome: Omit<Income, 'id'>) => {
    const fullIncome = { ...updatedIncome, id };
    updateStateAndSync(
      prev => ({ ...prev, incomes: prev.incomes.map(i => i.id === id ? fullIncome : i) }),
      { type: 'update', dataType: 'income', payload: fullIncome }
    );
  };

  const deleteIncome = (id: string) => {
    updateStateAndSync(
      prev => ({ ...prev, incomes: prev.incomes.filter(i => i.id !== id) }),
      { type: 'delete', dataType: 'income', payload: { id } }
    );
  };
  
  const addExpense = (expense: Omit<Expense, 'id'>) => {
    const newExpense = { ...expense, id: Date.now().toString() };
    updateStateAndSync(
      prev => ({ ...prev, expenses: [...prev.expenses, newExpense] }),
      { type: 'add', dataType: 'expense', payload: newExpense }
    );
  };

  const updateExpense = (id: string, updatedExpense: Omit<Expense, 'id'>) => {
    const fullExpense = { ...updatedExpense, id };
    updateStateAndSync(
      prev => ({ ...prev, expenses: prev.expenses.map(e => e.id === id ? fullExpense : e) }),
      { type: 'update', dataType: 'expense', payload: fullExpense }
    );
  };

  const deleteExpense = (id: string) => {
    updateStateAndSync(
      prev => ({ ...prev, expenses: prev.expenses.filter(e => e.id !== id) }),
      { type: 'delete', dataType: 'expense', payload: { id } }
    );
  };
  
  const addSegment = (segment: Omit<Segment, 'id'>) => {
    const newSegment = { ...segment, id: Date.now().toString() };
    updateStateAndSync(
      prev => ({ ...prev, segments: [...prev.segments, newSegment] }),
      { type: 'add', dataType: 'segment', payload: newSegment }
    );
  };

  const updateSegment = (id: string, updatedSegment: Omit<Segment, 'id'>) => {
    const fullSegment = { ...updatedSegment, id };
    updateStateAndSync(
      prev => ({ ...prev, segments: prev.segments.map(s => s.id === id ? fullSegment : s) }),
      { type: 'update', dataType: 'segment', payload: fullSegment }
    );
  };

  const deleteSegment = (id: string) => {
    const isSegmentInUse = expenses.some(e => e.segmentId === id);
    if (isSegmentInUse) {
      alert('This segment cannot be deleted because it is associated with one or more expenses.');
      return;
    }
    updateStateAndSync(
      prev => ({ ...prev, segments: prev.segments.filter(s => s.id !== id) }),
      { type: 'delete', dataType: 'segment', payload: { id } }
    );
  };

  return (
    <DataContext.Provider value={{
      incomes, expenses, segments, isOnline, isSyncing, isLoading,
      addIncome, updateIncome, deleteIncome,
      addExpense, updateExpense, deleteExpense,
      addSegment, updateSegment, deleteSegment
    }}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
