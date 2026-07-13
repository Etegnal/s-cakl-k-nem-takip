'use client';

import React, { useState, useEffect } from 'react';
import Login from '@/components/Login';
import Dashboard from '@/components/Dashboard';
import Settings from '@/components/Settings';
import { Loader2 } from 'lucide-react';
import { initClientDb } from '@/lib/clientDb';

type Screen = 'dashboard' | 'settings';

export default function Home() {
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    // Initialize LocalStorage database
    initClientDb();
    checkSession();
  }, []);

  const checkSession = () => {
    try {
      const activeUser = sessionStorage.getItem('tt_active_user');
      if (activeUser) {
        setUser(JSON.parse(activeUser));
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setCheckingSession(false);
    }
  };

  const handleLoginSuccess = (loggedInUser: { id: string; username: string }) => {
    setUser(loggedInUser);
    sessionStorage.setItem('tt_active_user', JSON.stringify(loggedInUser));
    setScreen('dashboard');
  };

  const handleLogoutSuccess = () => {
    setUser(null);
    sessionStorage.removeItem('tt_active_user');
  };

  if (checkingSession) {
    return (
      <div 
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          gap: '16px'
        }}
      >
        <Loader2 className="animate-spin" size={40} style={{ color: 'var(--primary)' }} />
        <span style={{ color: 'var(--text-muted)', fontSize: '15px', fontWeight: 500 }}>
          Sistem yükleniyor...
        </span>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  if (screen === 'settings') {
    return <Settings onBack={() => setScreen('dashboard')} />;
  }

  return (
    <Dashboard 
      user={user} 
      onLogoutSuccess={handleLogoutSuccess} 
      onNavigateToSettings={() => setScreen('settings')} 
    />
  );
}
