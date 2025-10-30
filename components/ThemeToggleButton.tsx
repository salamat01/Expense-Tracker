import React from 'react';
import { useTheme } from '../contexts/ThemeContext';
import SunIcon from './icons/SunIcon';
import MoonIcon from './icons/MoonIcon';
import SystemIcon from './icons/SystemIcon';

const ThemeToggleButton: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  const renderIcon = () => {
    switch (theme) {
      case 'light':
        return <SunIcon />;
      case 'dark':
        return <MoonIcon />;
      case 'system':
        return <SystemIcon />;
      default:
        return <SystemIcon />;
    }
  };
  
  const getAriaLabel = () => {
     switch (theme) {
      case 'light':
        return 'Current theme is light. Switch to dark theme.';
      case 'dark':
        return 'Current theme is dark. Switch to system theme.';
      case 'system':
        return 'Current theme follows system preference. Switch to light theme.';
      default:
        return 'Toggle theme';
    }
  }

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-full text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary dark:focus:ring-offset-gray-800 transition-all"
      aria-label={getAriaLabel()}
    >
      {renderIcon()}
    </button>
  );
};

export default ThemeToggleButton;