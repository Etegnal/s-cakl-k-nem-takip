'use client';

import React, { useState } from 'react';
import { Lock, User, Thermometer } from 'lucide-react';
import styles from './Login.module.css';

interface LoginProps {
  onLoginSuccess: (user: { id: string; username: string }) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    // Simulate network delay for premium experience
    setTimeout(() => {
      try {
        const storedUser = localStorage.getItem('tt_user_username') || 'admin';
        const storedPass = localStorage.getItem('tt_user_password') || 'Admin123!';

        if (username === storedUser && password === storedPass) {
          onLoginSuccess({
            id: 'admin_user',
            username: storedUser,
          });
        } else {
          setError('Kullanıcı adı veya şifre hatalı.');
        }
      } catch {
        setError('Giriş işlemi sırasında yerel depolama hatası oluştu.');
      } finally {
        setLoading(false);
      }
    }, 800);
  };

  return (
    <div className={styles.loginContainer}>
      <div className={`${styles.blob} ${styles.blob1}`}></div>
      <div className={`${styles.blob} ${styles.blob2}`}></div>

      <div className={`${styles.loginCard} glass-card`}>
        <div className={styles.loginHeader}>
          <div 
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: '50px',
              marginBottom: '16px',
            }}
          >
            <img 
              src="/s-cakl-k-nem-takip/torku.png" 
              alt="Torku Logo" 
              style={{ height: '50px', objectFit: 'contain' }} 
            />
          </div>
          <h1 className={styles.title}>Isı & Nem Takip</h1>
          <p className={styles.subtitle}>Sisteme erişmek için kimliğinizi doğrulayın</p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="username">Kullanıcı Adı</label>
            <div style={{ position: 'relative' }}>
              <span 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <User size={18} />
              </span>
              <input
                id="username"
                type="text"
                className="form-input"
                style={{ width: '100%', paddingLeft: '44px' }}
                placeholder="admin"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Şifre</label>
            <div style={{ position: 'relative' }}>
              <span 
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Lock size={18} />
              </span>
              <input
                id="password"
                type="password"
                className="form-input"
                style={{ width: '100%', paddingLeft: '44px' }}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
      </div>
    </div>
  );
}
