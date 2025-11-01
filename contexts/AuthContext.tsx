import React, { createContext, useContext, useState, useEffect } from 'react';
import type { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('currentUser');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('currentUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('currentUser');
    }
  }, [currentUser]);

  const signInWithGoogle = async (): Promise<void> => {
    return new Promise((resolve) => {
      setTimeout(() => { // Simulate API call to Google
        const mockUser: User = {
          id: 'google-user-12345',
          email: 'shuvo.dev@gmail.com',
          name: 'Shuvo',
          picture: `https://api.dicebear.com/8.x/initials/svg?seed=Shuvo`, // A placeholder avatar
        };
        setCurrentUser(mockUser);
        resolve();
      }, 500);
    });
  };

  const signOut = () => {
    setCurrentUser(null);
  };

  const value = { currentUser, signInWithGoogle, signOut };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
