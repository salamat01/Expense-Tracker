
import React from 'react';
import { NavLink } from 'react-router-dom';
import ExpenseIcon from './icons/ExpenseIcon';
import SegmentIcon from './icons/SegmentIcon';
import IncomeIcon from './icons/IncomeIcon';
import DashboardIcon from './icons/DashboardIcon';

const BottomNav: React.FC = () => {
  const commonClasses = "flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-300";
  const activeClass = "text-brand-primary dark:text-sky-400";
  const inactiveClass = "text-gray-500 dark:text-gray-400 hover:text-brand-primary dark:hover:text-sky-400";

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex justify-around max-w-2xl mx-auto">
        <NavLink to="/" end className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <ExpenseIcon />
          <span className="text-xs mt-1">Expense</span>
        </NavLink>
        <NavLink to="/segments" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <SegmentIcon />
          <span className="text-xs mt-1">Segments</span>
        </NavLink>
        <NavLink to="/income" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <IncomeIcon />
          <span className="text-xs mt-1">Income</span>
        </NavLink>
        <NavLink to="/dashboard" className={({ isActive }) => `${commonClasses} ${isActive ? activeClass : inactiveClass}`}>
          <DashboardIcon />
          <span className="text-xs mt-1">Dashboard</span>
        </NavLink>
      </div>
    </nav>
  );
};

export default BottomNav;