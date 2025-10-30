import React from 'react';
import ThemeToggleButton from './ThemeToggleButton';

const Header: React.FC = () => {
  return (
    <header className="fixed top-0 left-0 right-0 bg-brand-surface dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-md z-10">
      <div className="container mx-auto p-4 max-w-2xl flex justify-between items-center py-3">
        <h1 className="text-xl font-bold text-brand-primary dark:text-sky-400">Shuvo Expense Tracker</h1>
        <ThemeToggleButton />
      </div>
    </header>
  );
};

export default Header;