import React, { useState, useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Conversations } from './pages/Conversations';
import { Broadcasts } from './pages/Broadcasts';
import { Tasks } from './pages/Tasks';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { api } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    api.refresh()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const socketUrl = window.location.origin;
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    socket?.disconnect();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-brand-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        setCurrentView={setCurrentView}
        onLogout={handleLogout}
      />
      
      <main className="flex-1 overflow-y-auto">
        {currentView === 'dashboard' && <Dashboard />}
        {currentView === 'customers' && <Customers />}
        {currentView === 'conversations' && <Conversations />}
        {currentView === 'broadcasts' && <Broadcasts />}
        {currentView === 'tasks' && <Tasks />}
        {currentView === 'settings' && <Settings />}
      </main>
    </div>
  );
}
