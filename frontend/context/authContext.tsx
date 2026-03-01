import React, { createContext, useContext, useState } from 'react';
import { User } from '../types/user';

interface AuthContextType {
  user: User | null;
  setUser: (user: User | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  
  //TODO: mocked, replace this with login
  const [user, setUser] = useState<User | null>({
    _id: 'abc123',
    _username: 'maria_calendarios',
    _firstName: 'María',
    _lastName: 'Calendarios',
    _email: 'mariacalendarios@gmail.com',
    _bio: 'Seville, Spain | Travel Enthusiast | Food Lover | Sharing my adventures one post at a time',
    _pronouns: 'she/her',
  });

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return context;
};