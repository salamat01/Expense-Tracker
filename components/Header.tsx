import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggleButton from './ThemeToggleButton';
import SyncStatus from './SyncStatus';

interface HeaderProps {
  isOnline: boolean;
  isSyncing: boolean;
}

const Header: React.FC<HeaderProps> = ({ isOnline, isSyncing }) => {
  const { currentUser } = useAuth();

  return (
    <header className="fixed top-0 left-0 right-0 bg-brand-surface dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md z-10">
      <div className="container mx-auto p-4 max-w-2xl flex justify-between items-center py-3">
        <h1 className="text-xl font-bold text-brand-primary dark:text-sky-400">Shuvo Expense Tracker</h1>
        <div className="flex items-center gap-4">
          <SyncStatus isOnline={isOnline} isSyncing={isSyncing} />
          {currentUser && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:block">{currentUser.name}</span>
              <img src={currentUser.picture} alt={currentUser.name} className="w-8 h-8 rounded-full border-2 border-gray-200 dark:border-gray-600"/>
            </div>
          )}
          <ThemeToggleButton />
        </div>
      </div>
    </header>
  );
};

export default Header;