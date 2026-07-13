'use client';

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Mail, 
  Sliders, 
  Save, 
  Send, 
  Cpu, 
  ShieldAlert,
  Loader2
} from 'lucide-react';
import { getClientSettings, saveClientSettings, getClientMachines, saveClientMachine } from '@/lib/clientDb';
import { sendClientAlertEmail } from '@/lib/clientEmail';
import styles from './Dashboard.module.css';

interface SettingsProps {
  onBack: () => void;
}

export default function Settings({ onBack }: SettingsProps) {
  // SMTP settings state
  const [smtp, setSmtp] = useState({
    smtp_host: 'smtp.gmail.com',
    smtp_port: '587',
    smtp_user: 'erenaoyunda@gmail.com',
    smtp_pass: 'fujtdllqonpzocfi',
    smtp_secure: 'false',
    alert_email: 'erenaoyunda@gmail.com',
    email_provider: 'smtp' as 'smtp' | 'web3forms',
    web3forms_key: ''
  });

  // Machine thresholds state
  const [machines, setMachines] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  
  // Selected machine editing details
  const [editForm, setEditForm] = useState({
    name: '',
    location: '',
    maxTemperature: 40.0,
    minTemperature: 15.0,
    maxHumidity: 80.0,
    minHumidity: 20.0
  });

  const [savingSmtp, setSavingSmtp] = useState(false);
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [savingThreshold, setSavingThreshold] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSmtpSettings();
    fetchMachines();
  }, []);

  useEffect(() => {
    if (selectedMachineId) {
      const machine = machines.find(m => m.id === selectedMachineId);
      if (machine) {
        setEditForm({
          name: machine.name,
          location: machine.location || '',
          maxTemperature: machine.threshold?.maxTemperature ?? 40.0,
          minTemperature: machine.threshold?.minTemperature ?? 15.0,
          maxHumidity: machine.threshold?.maxHumidity ?? 80.0,
          minHumidity: machine.threshold?.minHumidity ?? 20.0
        });
      }
    }
  }, [selectedMachineId, machines]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const fetchSmtpSettings = () => {
    try {
      const data = getClientSettings();
      setSmtp({
        smtp_host: data.smtp_host || 'smtp.gmail.com',
        smtp_port: data.smtp_port || '587',
        smtp_user: data.smtp_user || 'erenaoyunda@gmail.com',
        smtp_pass: data.smtp_pass || 'fujtdllqonpzocfi',
        smtp_secure: data.smtp_secure || 'false',
        alert_email: data.alert_email || 'erenaoyunda@gmail.com',
        email_provider: (data.email_provider || 'smtp') as 'smtp' | 'web3forms',
        web3forms_key: data.web3forms_key || ''
      });
    } catch (err) {
      console.error('Failed to load SMTP settings:', err);
    }
  };

  const fetchMachines = () => {
    try {
      const data = getClientMachines();
      setMachines(data);
      if (data.length > 0 && !selectedMachineId) {
        setSelectedMachineId(data[0].id);
      }
    } catch (err) {
      console.error('Failed to load machines:', err);
    }
  };

  const handleSmtpChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSmtp(prev => ({ ...prev, [name]: value }));
  };

  const handleEditFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm(prev => ({ ...prev, [name]: value }));
  };

  const saveSmtpSettings = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSmtp(true);

    setTimeout(() => {
      try {
        saveClientSettings(smtp);
        showToast('E-posta ayarları başarıyla kaydedildi.', 'success');
        fetchSmtpSettings();
      } catch {
        showToast('Ayarlar kaydedilemedi.', 'error');
      } finally {
        setSavingSmtp(false);
      }
    }, 500);
  };

  const testSmtpConnection = () => {
    setTestingSmtp(true);
    showToast('Bağlantı test ediliyor, lütfen bekleyin...', 'success');

    // Simulate sending test email in the browser (or send real if Web3Forms)
    setTimeout(async () => {
      try {
        const result = await sendClientAlertEmail({
          machineName: 'Test-Cihazı',
          location: 'Test Laboratuvarı',
          type: 'TEMPERATURE',
          value: 45.0,
          threshold: 40.0,
          timestamp: new Date().toISOString(),
          recipientEmail: smtp.alert_email,
          provider: smtp.email_provider,
          web3formsKey: smtp.web3forms_key
        });

        if (result.success) {
          if (smtp.email_provider === 'web3forms') {
            showToast('E-posta Test Başarılı! Gerçek e-posta gelen kutunuza gönderildi. 📬', 'success');
          } else {
            showToast('SMTP Test Başarılı! E-posta alıcı adresine simüle olarak gönderildi (Localhost değil).', 'success');
          }
        } else {
          showToast(result.error || 'E-posta Test Başarısız.', 'error');
        }
      } catch (err: any) {
        showToast('Bağlantı testi sırasında hata oluştu: ' + (err.message || ''), 'error');
      } finally {
        setTestingSmtp(false);
      }
    }, 1200);
  };

  const saveMachineThresholds = (e: React.FormEvent) => {
    e.preventDefault();
    setSavingThreshold(true);

    setTimeout(() => {
      try {
        saveClientMachine({
          id: selectedMachineId,
          ...editForm
        });
        showToast(`${editForm.name} cihazının limitleri güncellendi.`, 'success');
        fetchMachines();
      } catch {
        showToast('Eşik değerler kaydedilemedi.', 'error');
      } finally {
        setSavingThreshold(false);
      }
    }, 500);
  };

  return (
    <div className={styles.dashboardWrapper}>
      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <ShieldAlert size={20} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Header */}
      <nav className={`${styles.nav} glass-panel`}>
        <div className={styles.brand} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button 
            onClick={onBack} 
            className="btn btn-secondary" 
            style={{ padding: '8px', borderRadius: '50%', display: 'flex', alignItems: 'center' }}
            title="Geri Dön"
          >
            <ArrowLeft size={18} />
          </button>
          <img 
            src="/s-cakl-k-nem-takip/torku.png" 
            alt="Torku Logo" 
            style={{ height: '28px', objectFit: 'contain' }} 
          />
          <span>Sistem Ayarları</span>
        </div>
        <button onClick={onBack} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
          Paneli Görüntüle
        </button>
      </nav>

      {/* Two Column Forms */}
      <div className={styles.detailGrid}>
        
        {/* Left Column: SMTP / E-posta Configuration */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)', padding: '10px', borderRadius: '10px' }}>
              <Mail size={22} />
            </div>
            <div>
              <h3 className={styles.sectionTitle} style={{ fontSize: '18px' }}>E-posta Ayarları</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sınır aşım bildirim e-postaları için sağlayıcı ayarları</p>
            </div>
          </div>

          <form onSubmit={saveSmtpSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="email_provider">E-posta Sağlayıcı (Provider)</label>
              <select
                id="email_provider"
                name="email_provider"
                className="form-input"
                value={smtp.email_provider}
                onChange={handleSmtpChange}
              >
                <option value="smtp">SMTP Sunucusu (Sadece Yerel Bilgisayarda çalışır)</option>
                <option value="web3forms">Web3Forms (GitHub Pages'ten GERÇEK E-posta Gönderir! 🚀)</option>
              </select>
            </div>

            {smtp.email_provider === 'smtp' ? (
              <>
                <div className="form-group">
                  <label className="form-label" htmlFor="smtp_host">SMTP Sunucu Adresi (Host)</label>
                  <input
                    id="smtp_host"
                    name="smtp_host"
                    type="text"
                    className="form-input"
                    placeholder="smtp.gmail.com"
                    value={smtp.smtp_host}
                    onChange={handleSmtpChange}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="smtp_port">Port</label>
                    <input
                      id="smtp_port"
                      name="smtp_port"
                      type="text"
                      className="form-input"
                      placeholder="587"
                      value={smtp.smtp_port}
                      onChange={handleSmtpChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="smtp_secure">Güvenli Bağlantı (SSL/TLS)</label>
                    <select
                      id="smtp_secure"
                      name="smtp_secure"
                      className="form-input"
                      value={smtp.smtp_secure}
                      onChange={handleSmtpChange}
                    >
                      <option value="false">STARTTLS / TLS (Port 587)</option>
                      <option value="true">SSL (Port 465)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp_user">Kullanıcı Adı (E-posta)</label>
                  <input
                    id="smtp_user"
                    name="smtp_user"
                    type="email"
                    className="form-input"
                    placeholder="ornek@gmail.com"
                    value={smtp.smtp_user}
                    onChange={handleSmtpChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="smtp_pass">Şifre (SMTP / Uygulama Şifresi)</label>
                  <input
                    id="smtp_pass"
                    name="smtp_pass"
                    type="password"
                    className="form-input"
                    placeholder="••••••••"
                    value={smtp.smtp_pass}
                    onChange={handleSmtpChange}
                  />
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    * Yerel bilgisayarınızda e-posta göndermek için Gmail Uygulama şifrenizi girin.
                  </span>
                </div>
              </>
            ) : (
              <div className="form-group">
                <label className="form-label" htmlFor="web3forms_key">Web3Forms Erişim Anahtarı (Access Key)</label>
                <input
                  id="web3forms_key"
                  name="web3forms_key"
                  type="password"
                  className="form-input"
                  placeholder="örn: a1b2c3d4-e5f6-7a8b-9c0d-e1f2a3b4c5d6"
                  value={smtp.web3forms_key || ''}
                  onChange={handleSmtpChange}
                  required
                />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: '1.5', marginTop: '4px' }}>
                  GitHub Pages gibi statik web sunucularında doğrudan Gmail SMTP'si çalıştırılamaz. 
                  Bu yüzden gerçek e-posta almak için ücretsiz Web3Forms servisi kullanılır. 
                  Anahtarınız yoksa <a href="https://web3forms.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', textDecoration: 'underline', fontWeight: 600 }}>buraya tıklayıp</a> e-postanızı girerek 5 saniyede ücretsiz bir anahtar alabilirsiniz.
                </span>
              </div>
            )}

            <div className="form-group" style={{ borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
              <label className="form-label" htmlFor="alert_email">Bildirimlerin Gönderileceği Alıcı E-posta</label>
              <input
                id="alert_email"
                name="alert_email"
                type="email"
                className="form-input"
                placeholder="takipci@sirket.com"
                value={smtp.alert_email}
                onChange={handleSmtpChange}
                required
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ flex: 1 }}
                disabled={savingSmtp || testingSmtp}
              >
                {savingSmtp ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Kaydet</span>
              </button>
              <button 
                type="button" 
                onClick={testSmtpConnection} 
                className="btn btn-secondary"
                disabled={savingSmtp || testingSmtp}
              >
                {testingSmtp ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
                <span>Bağlantıyı Test Et</span>
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Machine Threshold Settings */}
        <div className="glass-panel" style={{ padding: '30px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '24px' }}>
            <div style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)', padding: '10px', borderRadius: '10px' }}>
              <Sliders size={22} />
            </div>
            <div>
              <h3 className={styles.sectionTitle} style={{ fontSize: '18px' }}>Eşik Değerleri Limiti</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cihaz bazlı sıcaklık ve nem alarm sınırları</p>
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label">Düzenlenecek Cihazı Seçin:</label>
            <select 
              className="form-input"
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {selectedMachineId ? (
            <form onSubmit={saveMachineThresholds} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="name">Cihaz Adı</label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  className="form-input"
                  value={editForm.name}
                  onChange={handleEditFormChange}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="location">Bölüm / Konum</label>
                <input
                  id="location"
                  name="location"
                  type="text"
                  className="form-input"
                  value={editForm.location}
                  onChange={handleEditFormChange}
                  placeholder="örn: Bölüm A - Enjeksiyon"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--glass-border)', paddingTop: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="minTemperature">Min. Sıcaklık Limit (°C)</label>
                  <input
                    id="minTemperature"
                    name="minTemperature"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editForm.minTemperature}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="maxTemperature">Max. Sıcaklık Limit (°C)</label>
                  <input
                    id="maxTemperature"
                    name="maxTemperature"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editForm.maxTemperature}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div className="form-group">
                  <label className="form-label" htmlFor="minHumidity">Min. Nem Limit (%)</label>
                  <input
                    id="minHumidity"
                    name="minHumidity"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editForm.minHumidity}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="maxHumidity">Max. Nem Limit (%)</label>
                  <input
                    id="maxHumidity"
                    name="maxHumidity"
                    type="number"
                    step="0.1"
                    className="form-input"
                    value={editForm.maxHumidity}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>
              </div>

              <button 
                type="submit" 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '8px' }}
                disabled={savingThreshold}
              >
                {savingThreshold ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                <span>Limitleri Kaydet</span>
              </button>
            </form>
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '40px 0' }}>
              <Cpu size={32} style={{ marginBottom: '10px', opacity: 0.5 }} />
              <p>Lütfen düzenlemek için bir makine seçin.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
