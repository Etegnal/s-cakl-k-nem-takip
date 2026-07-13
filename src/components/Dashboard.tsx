'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Thermometer, 
  Droplets, 
  Cpu, 
  AlertTriangle, 
  UploadCloud, 
  Settings as SettingsIcon, 
  LogOut, 
  RefreshCw,
  Bell
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import * as xlsx from 'xlsx';
import { 
  getClientStats, 
  getClientMachines, 
  getClientAlerts, 
  findOrCreateClientMachine, 
  addClientReading, 
  addClientAlert,
  getClientSettings
} from '@/lib/clientDb';
import { sendClientAlertEmail } from '@/lib/clientEmail';
import styles from './Dashboard.module.css';

interface DashboardProps {
  user: { id: string; username: string };
  onLogoutSuccess: () => void;
  onNavigateToSettings: () => void;
}

export default function Dashboard({ user, onLogoutSuccess, onNavigateToSettings }: DashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [machines, setMachines] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>('');
  const [chartData, setChartData] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [loading, setLoading] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
    refreshAllData();
  }, []);

  // Fetch readings when selected machine changes
  useEffect(() => {
    if (selectedMachineId) {
      loadChartData(selectedMachineId);
    }
  }, [selectedMachineId, machines]);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 5000);
  };

  const refreshAllData = () => {
    setLoading(true);
    try {
      const currentStats = getClientStats();
      const currentMachines = getClientMachines();
      const currentAlerts = getClientAlerts();

      setStats(currentStats);
      setMachines(currentMachines);
      setAlerts(currentAlerts);

      if (currentMachines.length > 0 && !selectedMachineId) {
        setSelectedMachineId(currentMachines[0].id);
      }
    } catch (err) {
      console.error('Error refreshing local data:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadChartData = (machineId: string) => {
    const machine = machines.find(m => m.id === machineId);
    if (!machine || !machine.readings) {
      setChartData([]);
      return;
    }

    // Format timestamps chronologically (reversing to match standard chart timeline)
    const formatted = [...machine.readings].reverse().map((d: any) => ({
      ...d,
      formattedTime: new Date(d.timestamp).toLocaleTimeString('tr-TR', {
        hour: '2-digit',
        minute: '2-digit'
      }),
      formattedDate: new Date(d.timestamp).toLocaleDateString('tr-TR', {
        day: '2-digit',
        month: '2-digit'
      })
    }));

    setChartData(formatted);
  };

  const handleLogout = () => {
    onLogoutSuccess();
  };

  // Drag and Drop files handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await uploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await uploadFile(e.target.files[0]);
    }
  };

  const onUploadClick = () => {
    fileInputRef.current?.click();
  };

  // Client-side Excel parsing logic using SheetJS
  const uploadFile = (file: File) => {
    const validExtensions = ['.xlsx', '.xls'];
    const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

    if (!validExtensions.includes(fileExtension)) {
      showToast('Sadece Excel dosyaları (.xlsx, .xls) yükleyebilirsiniz.', 'error');
      return;
    }

    setUploading(true);
    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // cellDates: true parses dates automatically into JS objects
        const workbook = xlsx.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const rows = xlsx.utils.sheet_to_json<any>(worksheet, { raw: true });

        if (rows.length === 0) {
          showToast('Excel dosyası boş veya okunamadı.', 'error');
          return;
        }

        const keys = Object.keys(rows[0]);
        const machineKey = keys.find(k => /device|cihaz|makine|machine|ad|name/i.test(k));
        const tempKey = keys.find(k => /sicaklik|sıcaklık|isi|ısı|temp|temperature/i.test(k));
        const humidityKey = keys.find(k => /nem|humid|humidity/i.test(k));
        const dateKey = keys.find(k => /tarih|zaman|date|time|timestamp/i.test(k));

        if (!machineKey || !tempKey || !humidityKey) {
          showToast('Geçersiz Excel formatı. Kolonlar: Makine Adı, Sıcaklık ve Nem içermelidir.', 'error');
          return;
        }

        let processedCount = 0;
        let alertsCount = 0;
        const settings = getClientSettings();

        for (const row of rows) {
          const rawMachineName = String(row[machineKey] || '').trim();
          const rawTemp = parseFloat(row[tempKey]);
          const rawHumidity = parseFloat(row[humidityKey]);

          if (!rawMachineName || isNaN(rawTemp) || isNaN(rawHumidity)) {
            continue; // Skip invalid row
          }

          let timestamp = new Date().toISOString();
          if (dateKey && row[dateKey]) {
            const val = row[dateKey];
            if (val instanceof Date) {
              timestamp = val.toISOString();
            } else {
              const parsed = Date.parse(String(val));
              if (!isNaN(parsed)) {
                timestamp = new Date(parsed).toISOString();
              }
            }
          }

          // 1. Find or create client-side machine record
          const machine = findOrCreateClientMachine(rawMachineName);

          // 2. Save reading
          addClientReading(machine.id, rawTemp, rawHumidity, timestamp, file.name);
          processedCount++;

          // 3. Check thresholds
          const threshold = machine.threshold;
          
          // Temperature checks
          let tempBreach = false;
          let tempLimit = 0;
          if (rawTemp > threshold.maxTemperature) {
            tempBreach = true;
            tempLimit = threshold.maxTemperature;
          } else if (rawTemp < threshold.minTemperature) {
            tempBreach = true;
            tempLimit = threshold.minTemperature;
          }

          if (tempBreach) {
            addClientAlert({
              machineName: rawMachineName,
              type: 'TEMPERATURE',
              value: rawTemp,
              threshold: tempLimit,
              timestamp,
              emailSent: true
            });
            alertsCount++;
            
            // Trigger simulated mail log
            await sendClientAlertEmail({
              machineName: rawMachineName,
              location: machine.location,
              type: 'TEMPERATURE',
              value: rawTemp,
              threshold: tempLimit,
              timestamp,
              recipientEmail: settings.alert_email
            });
          }

          // Humidity checks
          let humidBreach = false;
          let humidLimit = 0;
          if (rawHumidity > threshold.maxHumidity) {
            humidBreach = true;
            humidLimit = threshold.maxHumidity;
          } else if (rawHumidity < threshold.minHumidity) {
            humidBreach = true;
            humidLimit = threshold.minHumidity;
          }

          if (humidBreach) {
            addClientAlert({
              machineName: rawMachineName,
              type: 'HUMIDITY',
              value: rawHumidity,
              threshold: humidLimit,
              timestamp,
              emailSent: true
            });
            alertsCount++;
            
            // Trigger simulated mail log
            await sendClientAlertEmail({
              machineName: rawMachineName,
              location: machine.location,
              type: 'HUMIDITY',
              value: rawHumidity,
              threshold: humidLimit,
              timestamp,
              recipientEmail: settings.alert_email
            });
          }
        }

        showToast(
          `${processedCount} adet ölçüm yerel depolamaya yüklendi. ${
            alertsCount > 0 ? `(${alertsCount} limit aşımı tespit edildi!)` : ''
          }`,
          alertsCount > 0 ? 'error' : 'success'
        );

        refreshAllData();
      } catch (err) {
        console.error('Error reading Excel locally:', err);
        showToast('Excel dosyası çözümlenirken hata oluştu.', 'error');
      } finally {
        setUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsArrayBuffer(file);
  };

  const getStatus = (machine: any) => {
    if (!machine.readings || machine.readings.length === 0) return 'NO_DATA';
    const lastReading = machine.readings[0];
    const threshold = machine.threshold;

    if (!threshold) return 'OK';

    const tempBreach = 
      lastReading.temperature > threshold.maxTemperature || 
      lastReading.temperature < threshold.minTemperature;
    const humBreach = 
      lastReading.humidity > threshold.maxHumidity || 
      lastReading.humidity < threshold.minHumidity;

    if (tempBreach || humBreach) return 'BREACHED';
    return 'OK';
  };

  return (
    <div className={styles.dashboardWrapper}>
      {/* Toast Notification */}
      {toast && (
        <div className={`${styles.toast} ${toast.type === 'success' ? styles.toastSuccess : styles.toastError}`}>
          <AlertTriangle size={20} />
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation */}
      <nav className={`${styles.nav} glass-panel`}>
        <div className={styles.brand}>
          <Cpu size={24} style={{ color: 'var(--primary)' }} />
          <span>Isı & Nem Takip Paneli (Static)</span>
        </div>
        <div className={styles.navActions}>
          <span className={styles.userInfo}>Hoş geldiniz, @{user.username}</span>
          <button onClick={onNavigateToSettings} className="btn btn-secondary" style={{ padding: '8px 16px' }}>
            <SettingsIcon size={16} />
            <span>Ayarlar</span>
          </button>
          <button onClick={handleLogout} className="btn btn-danger" style={{ padding: '8px 16px' }}>
            <LogOut size={16} />
            <span>Çıkış</span>
          </button>
        </div>
      </nav>

      {/* Stats Cards Grid */}
      <div className={styles.statsGrid}>
        <div className="glass-card statCard">
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Toplam Cihaz</span>
            <span className={styles.statValue}>{stats?.totalMachines ?? 0}</span>
          </div>
          <div className={styles.statIcon} style={{ background: 'rgba(59, 130, 246, 0.1)', color: 'var(--primary)' }}>
            <Cpu size={24} />
          </div>
        </div>

        <div className="glass-card statCard">
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ort. Sıcaklık</span>
            <span className={styles.statValue}>
              {stats?.avgTemperature !== undefined ? `${stats.avgTemperature}°C` : '--'}
            </span>
          </div>
          <div className={styles.statIcon} style={{ background: 'rgba(6, 182, 212, 0.1)', color: 'var(--accent-cyan)' }}>
            <Thermometer size={24} />
          </div>
        </div>

        <div className="glass-card statCard">
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Ort. Nem</span>
            <span className={styles.statValue}>
              {stats?.avgHumidity !== undefined ? `${stats.avgHumidity}%` : '--'}
            </span>
          </div>
          <div className={styles.statIcon} style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
            <Droplets size={24} />
          </div>
        </div>

        <div className="glass-card statCard">
          <div className={styles.statInfo}>
            <span className={styles.statLabel}>Aktif Alarmlar (24s)</span>
            <span className={styles.statValue} style={{ color: (stats?.recentAlerts > 0) ? 'var(--accent-rose)' : 'inherit' }}>
              {stats?.recentAlerts ?? 0}
            </span>
          </div>
          <div className={styles.statIcon} style={{ 
            background: (stats?.recentAlerts > 0) ? 'rgba(244, 63, 94, 0.1)' : 'rgba(245, 158, 11, 0.1)', 
            color: (stats?.recentAlerts > 0) ? 'var(--accent-rose)' : 'var(--accent-amber)' 
          }}>
            <Bell size={24} />
          </div>
        </div>
      </div>

      {/* Top Section with Excel Upload & Quick Refresh */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: 700 }}>Excel Veri Yükleme Alanı</h3>
          <button 
            onClick={refreshAllData} 
            className="btn btn-secondary" 
            style={{ padding: '8px 16px', fontSize: '13px' }}
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Verileri Yenile</span>
          </button>
        </div>

        <div 
          className={`${styles.uploadZone} ${dragActive ? styles.uploadZoneActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onUploadClick}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept=".xlsx, .xls" 
            style={{ display: 'none' }} 
          />
          <UploadCloud size={40} style={{ color: uploading ? 'var(--accent-emerald)' : 'var(--text-muted)' }} />
          <p className={styles.uploadTitle}>
            {uploading ? 'Dosya İşleniyor...' : 'Veri yüklemek için tıklayın veya Excel sürükleyin'}
          </p>
          <p className={styles.uploadSubtitle}>
            Desteklenen dosyalar: <strong>.xlsx, .xls</strong> (Makine Adı, Sıcaklık, Nem sütunları olmalıdır)
          </p>
        </div>
      </div>

      {/* Main Grid: Machine List & Charts */}
      <div className={styles.mainGrid}>
        {/* Left Side: Cihaz Durum Tablosu */}
        <div className="glass-panel" style={{ padding: '24px' }}>
          <div className={styles.sectionHeader}>
            <h3 className={styles.sectionTitle}>Makinelerin Güncel Durumları</h3>
          </div>
          
          <div className="custom-table-wrapper">
            <table className="custom-table">
              <thead>
                <tr>
                  <th>Makine / Cihaz Adı</th>
                  <th>Konum</th>
                  <th>Sıcaklık</th>
                  <th>Nem</th>
                  <th>Son Ölçüm Zamanı</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {machines.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                      Kayıtlı makine bulunamadı. Veri yüklemesi yapın.
                    </td>
                  </tr>
                ) : (
                  machines.map((m) => {
                    const status = getStatus(m);
                    const lastReading = m.readings[0];
                    const isSelected = selectedMachineId === m.id;

                    return (
                      <tr 
                        key={m.id} 
                        onClick={() => setSelectedMachineId(m.id)}
                        style={{ 
                          cursor: 'pointer',
                          backgroundColor: isSelected ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                          borderLeft: isSelected ? '3px solid var(--primary)' : 'none'
                        }}
                      >
                        <td style={{ fontWeight: 600 }}>{m.name}</td>
                        <td style={{ color: 'var(--text-muted)' }}>{m.location || 'Bilinmiyor'}</td>
                        <td style={{ fontWeight: 500 }}>
                          {lastReading ? `${lastReading.temperature}°C` : '--'}
                        </td>
                        <td style={{ fontWeight: 500 }}>
                          {lastReading ? `${lastReading.humidity}%` : '--'}
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                          {lastReading 
                            ? new Date(lastReading.timestamp).toLocaleString('tr-TR') 
                            : '--'}
                        </td>
                        <td>
                          {status === 'BREACHED' && (
                            <span className="badge badge-danger">LİMİT AŞIMI</span>
                          )}
                          {status === 'OK' && (
                            <span className="badge badge-success">NORMAL</span>
                          )}
                          {status === 'NO_DATA' && (
                            <span className="badge badge-warning">VERİ YOK</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side: Trend Grafiği */}
        <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
          <h3 className={styles.sectionTitle} style={{ marginBottom: '20px' }}>
            Sıcaklık & Nem Trendi
          </h3>
          
          <div style={{ marginBottom: '15px' }}>
            <label className="form-label">Grafiği Gösterilecek Cihaz:</label>
            <select 
              className="form-input" 
              style={{ width: '100%', marginTop: '5px' }}
              value={selectedMachineId}
              onChange={(e) => setSelectedMachineId(e.target.value)}
            >
              {machines.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, minHeight: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {chartData.length === 0 ? (
              <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                Seçilen cihaza ait ölçüm verisi bulunmamaktadır.
              </span>
            ) : mounted ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="colorHumidity" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent-emerald)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--accent-emerald)" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis 
                    dataKey="formattedTime" 
                    stroke="var(--text-muted)" 
                    fontSize={11}
                  />
                  <YAxis stroke="var(--text-muted)" fontSize={11} />
                  <Tooltip 
                    contentStyle={{ 
                      background: 'rgba(15, 23, 42, 0.95)', 
                      border: '1px solid var(--glass-border)',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '13px'
                    }}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" />
                  <Area 
                    name="Sıcaklık (°C)"
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="var(--primary)" 
                    fillOpacity={1} 
                    fill="url(#colorTemp)" 
                  />
                  <Area 
                    name="Nem (%)"
                    type="monotone" 
                    dataKey="humidity" 
                    stroke="var(--accent-emerald)" 
                    fillOpacity={1} 
                    fill="url(#colorHumidity)" 
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>
      </div>

      {/* Bottom Section: Alert Logs */}
      <div className="glass-panel" style={{ padding: '24px' }}>
        <h3 className={styles.sectionTitle} style={{ marginBottom: '20px' }}>
          Sistem Alarm & Uyarı Günlükleri (Son 50)
        </h3>

        <div className="custom-table-wrapper" style={{ maxHeight: '300px', overflowY: 'auto' }}>
          <table className="custom-table">
            <thead>
              <tr>
                <th>Zaman Damgası</th>
                <th>Cihaz / Makine</th>
                <th>Ölçüm Türü</th>
                <th>Ölçülen Değer</th>
                <th>Eşik Sınırı</th>
                <th>E-posta Durumu</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                    Herhangi bir aşım uyarısı bulunmamaktadır. Sistem stabil çalışıyor.
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => {
                  const isTemp = alert.type === 'TEMPERATURE';
                  const unit = isTemp ? '°C' : '%';
                  return (
                    <tr key={alert.id}>
                      <td style={{ color: 'var(--text-muted)' }}>
                        {new Date(alert.timestamp).toLocaleString('tr-TR')}
                      </td>
                      <td style={{ fontWeight: 600 }}>{alert.machineName}</td>
                      <td>
                        <span style={{ 
                          color: isTemp ? 'var(--primary)' : 'var(--accent-emerald)',
                          fontWeight: 500
                        }}>
                          {isTemp ? 'Sıcaklık' : 'Nem'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>
                        {alert.value}{unit}
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {alert.threshold}{unit}
                      </td>
                      <td>
                        {alert.emailSent ? (
                          <span className="badge badge-success">SİMÜLE GÖNDERİLDİ</span>
                        ) : (
                          <span className="badge badge-warning">HATA</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
