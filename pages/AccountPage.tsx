import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import GoogleIcon from '../components/icons/GoogleIcon';

const AccountPage: React.FC = () => {
  const { currentUser, signOut, signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error("Sign in failed", err);
      // You could show an error message here
    } finally {
      setLoading(false);
    }
  };

  if (currentUser) {
    return (
      <div className="space-y-6 text-center">
        <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-200">My Account</h1>
        <div className="bg-brand-surface dark:bg-gray-800 p-6 rounded-xl shadow-md flex flex-col items-center">
          <img 
            src={currentUser.picture} 
            alt="Profile" 
            className="w-24 h-24 rounded-full mb-4 border-4 border-brand-primary"
          />
          <p className="text-xl font-semibold text-gray-800 dark:text-gray-200">
            {currentUser.name}
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {currentUser.email}
          </p>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">All your financial data is synced to this account.</p>
          <button
            onClick={signOut}
            className="mt-6 w-full max-w-xs mx-auto bg-brand-secondary hover:bg-red-600 text-white font-bold py-3 px-4 rounded-lg transition-colors"
          >
            Log Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-brand-surface dark:bg-gray-800 p-8 rounded-xl shadow-md text-center">
        <h1 className="text-3xl font-bold text-center mb-4 text-gray-800 dark:text-gray-200">
          Welcome
        </h1>
        <p className="text-center text-gray-500 dark:text-gray-400 mb-8">
          Sign in with your Google account to save and sync your financial data securely across all your devices.
        </p>
        
        <button
          onClick={handleSignIn}
          disabled={loading}
          className="w-full inline-flex items-center justify-center gap-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          <GoogleIcon />
          {loading ? 'Signing In...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
};

export default AccountPage;
