import React, { useState, useEffect, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './pages/Dashboard';
import { Customers } from './pages/Customers';
import { Conversations } from './pages/Conversations';
import { Broadcasts } from './pages/Broadcasts';
import { Settings } from './pages/Settings';
import { Login } from './pages/Login';
import { Toast } from './components/Toast';
import { api } from './services/api';

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [currentView, setCurrentView] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(true);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [socket, setSocket] = useState<Socket | null>(null);

  useEffect(() => {
    // CRITICAL SECURITY FIX: Rely on HttpOnly cookie to refresh session, not localStorage
    api.refresh()
      .then(() => setIsAuthenticated(true))
      .catch(() => setIsAuthenticated(false))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      const socketUrl = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? 'http://localhost:3000' : '/';
      const newSocket = io(socketUrl);
      setSocket(newSocket);

      newSocket.on('newMessage', (msg: any) => {
        if (msg.sender === 'USER') {
          const id = Math.random().toString(36).substring(2, 9);
          setNotifications(prev => [...prev, {
            id,
            title: 'New WhatsApp Message',
            message: msg.text || 'Media message received'
          }]);
        }
      });

      return () => {
        newSocket.disconnect();
      };
    }
  }, [isAuthenticated]);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const handleLogout = async () => {
    await api.logout();
    setIsAuthenticated(false);
    if (socket) socket.disconnect();
  };

  if (isLoading) {
    return <div className="h-screen w-screen flex items-center justify-center bg-slate-50">Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'customers':
        return <Customers />;
      case 'conversations':
        return <Conversations />;
      case 'broadcasts':
        return <Broadcasts />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-screen w-full bg-slate-50 overflow-hidden relative">
      <Sidebar currentView={currentView} setCurrentView={setCurrentView} onLogout={handleLogout} />
      <main className="flex-1 h-full overflow-hidden relative">
        {renderView()}
      </main>

      <div className="absolute top-4 right-4 z-50 flex flex-col space-y-2">
        {notifications.map(notif => (
          <Toast 
            key={notif.id} 
            id={notif.id} 
            title={notif.title} 
            message={notif.message} 
            onClose={removeNotification} 
          />
        ))}
      </div>
    </div>
  );
}
