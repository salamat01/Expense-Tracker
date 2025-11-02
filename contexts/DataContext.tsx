
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Income, Expense, Segment, SyncAction, AppData } from '../types';

// --- Mock Cloud Sync API ---
const CLOUD_API_DELAY = 1500; // ms
const MOCK_USER_ID = 'main_user'; // Static user ID for the simulation

const cloudSyncApi = {
  // Simulates saving data to a generic cloud file storage
  async saveData(userId: string, data: AppData): Promise<void> {
    return new Promise(resolve => {
      setTimeout(() => {
        const cloudKey = `cloud_sync_mock_${userId}`;
        console.log(`[CLOUDSYNC] Saving data to the cloud for user ${userId}...`);
        localStorage.setItem(cloudKey, JSON.stringify(data));
        console.log('[CLOUDSYNC] Save successful.');
        resolve();
      }, CLOUD_API_DELAY);
    });
  },

  // Simulates fetching data from the cloud
  async fetchData(userId: string): Promise<AppData | null> {
    return new Promise(resolve => {
      setTimeout(() => {
        const cloudKey = `cloud_sync_mock_${userId}`;
        console.log(`[CLOUDSYNC] Fetching data from the cloud for user ${userId}...`);
        const savedData = localStorage.getItem(cloudKey);
        if (savedData) {
          try {
            console.log('[CLOUDSYNC] Data found.');
            resolve(JSON.parse(savedData));
          } catch (e) {
             console.error('[CLOUDSYNC] Failed to parse cloud data.', e);
             resolve(null);
          }
        } else {
          console.log('[CLOUDSYNC] No data found for this user in the cloud.');
          resolve(null);
        }
      }, CLOUD_API_DELAY);
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
  addSegment: (segment: Omit<Segment, 'id' | 'color'> & {color?: string}) => void;
  updateSegment: (id: string, updatedSegment: Omit<Segment, 'id'>) => void;
  deleteSegment: (id: string) => void;
  replaceAllData: (data: AppData) => void;
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
        console.error(`Failed to parse local data for key "${key}"`, e);
        return fallback;
    }
}

const localDataKey = `localData_main`;
const syncQueueKey = `syncQueue_main`;

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [incomes, setIncomes] = useState<Income[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);

  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      const validateAndCleanData = (data: AppData | null): AppData => {
        if (!data || typeof data !== 'object') {
          return { incomes: [], expenses: [], segments: [] };
        }
        const cleanIncomes = (Array.isArray(data.incomes) ? data.incomes : []).filter(Boolean);
        const cleanExpenses = (Array.isArray(data.expenses) ? data.expenses : []).filter(Boolean);
        const cleanSegments = (Array.isArray(data.segments) ? data.segments : []).filter(Boolean);
        
        return { incomes: cleanIncomes, expenses: cleanExpenses, segments: cleanSegments };
      };
      
      const assignDefaultColors = (segs: Segment[]): Segment[] => {
          const defaultColors = ['#38BDF8', '#FBBF24', '#22C55E', '#8B5CF6', '#EC4899', '#EF4444'];
          return segs.map((s, index) => ({
              ...s,
              color: s.color || defaultColors[index % defaultColors.length]
          }));
      };
      
      const cloudData = await cloudSyncApi.fetchData(MOCK_USER_ID);
      let finalData: AppData;

      if (cloudData) {
        finalData = validateAndCleanData(cloudData);
      } else {
        const local = getLocalData<AppData | null>(localDataKey, null);
        finalData = validateAndCleanData(local);
      }

      const coloredSegments = assignDefaultColors(finalData.segments);
      
      setIncomes(finalData.incomes);
      setExpenses(finalData.expenses);
      setSegments(coloredSegments);
      
      localStorage.setItem(localDataKey, JSON.stringify({ ...finalData, segments: coloredSegments }));
      
      setIsLoading(false);
    };

    loadData();
  }, []);


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
  
  const processSyncQueue = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    
    const queue = getLocalData<SyncAction[]>(syncQueueKey, []);
    if (queue.length === 0) return;

    setIsSyncing(true);
    console.log(`[SYNC] Starting sync for ${queue.length} item(s).`);

    let currentCloudData = await cloudSyncApi.fetchData(MOCK_USER_ID) || { incomes: [], expenses: [], segments: [] };
    
    queue.forEach(action => {
      console.log(`[SYNC] Processing action: ${action.type} ${action.dataType}`);
      const { dataType, type, payload } = action;
      let dataArray;
      switch(dataType) {
        case 'income': dataArray = currentCloudData.incomes; break;
        case 'expense': dataArray = currentCloudData.expenses; break;
        case 'segment': dataArray = currentCloudData.segments; break;
        default: return;
      }
      
      if (type === 'add') {
        dataArray.push(payload);
      } else if (type === 'update') {
        const index = dataArray.findIndex(item => item.id === payload.id);
        if (index > -1) dataArray[index] = payload;
        else dataArray.push(payload);
      } else if (type === 'delete') {
        const index = dataArray.findIndex(item => item.id === payload.id);
        if (index > -1) dataArray.splice(index, 1);
      }
    });

    await cloudSyncApi.saveData(MOCK_USER_ID, currentCloudData);

    setIncomes(currentCloudData.incomes);
    setExpenses(currentCloudData.expenses);
    setSegments(currentCloudData.segments);
    
    localStorage.removeItem(syncQueueKey);
    
    console.log('[SYNC] Sync completed successfully.');
    setIsSyncing(false);
  }, [isOnline, isSyncing]);

  useEffect(() => {
    if (isOnline) {
      processSyncQueue();
    }
  }, [isOnline, processSyncQueue]);

  const updateStateAndSync = useCallback((updateFn: (prev: AppData) => AppData, syncAction: Omit<SyncAction, 'id'>) => {
    const appData = { incomes, expenses, segments };
    const newState = updateFn(appData);

    setIncomes(newState.incomes);
    setExpenses(newState.expenses);
    setSegments(newState.segments);
    localStorage.setItem(localDataKey, JSON.stringify(newState));

    if (isOnline) {
      cloudSyncApi.saveData(MOCK_USER_ID, newState);
    } else {
      const queue = getLocalData<SyncAction[]>(syncQueueKey, []);
      queue.push({ ...syncAction, id: Date.now().toString() });
      localStorage.setItem(syncQueueKey, JSON.stringify(queue));
    }
  }, [incomes, expenses, segments, isOnline]);

  const replaceAllData = useCallback((data: AppData) => {
    if (!data || !Array.isArray(data.incomes) || !Array.isArray(data.expenses) || !Array.isArray(data.segments)) {
      alert("Import failed: The file is not a valid backup file.");
      return;
    }
  
    const assignDefaultColors = (segs: Segment[]): Segment[] => {
      const defaultColors = ['#38BDF8', '#FBBF24', '#22C55E', '#8B5CF6', '#EC4899', '#EF4444'];
      return segs.map((s, index) => ({
          ...s,
          color: s.color || defaultColors[index % defaultColors.length]
      }));
    };

    const coloredSegments = assignDefaultColors(data.segments);
    const fullData = { incomes: data.incomes, expenses: data.expenses, segments: coloredSegments };
  
    setIncomes(fullData.incomes);
    setExpenses(fullData.expenses);
    setSegments(fullData.segments);
  
    localStorage.setItem(localDataKey, JSON.stringify(fullData));
    localStorage.removeItem(syncQueueKey); // Clear sync queue on import
  
    if (isOnline) {
      console.log("[SYNC] Full data import. Syncing with cloud.");
      setIsSyncing(true);
      cloudSyncApi.saveData(MOCK_USER_ID, fullData).finally(() => setIsSyncing(false));
    }
    alert("Data imported successfully! The app will now use the imported data.");
  }, [isOnline]);

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
      addSegment, updateSegment, deleteSegment,
      replaceAllData
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
