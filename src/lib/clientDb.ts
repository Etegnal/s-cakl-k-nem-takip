// Client-side local storage mock database for GitHub Pages deployment

export interface Machine {
  id: string;
  name: string;
  location: string;
  threshold: {
    maxTemperature: number;
    minTemperature: number;
    maxHumidity: number;
    minHumidity: number;
  };
  readings: Reading[];
}

export interface Reading {
  id: string;
  machineId: string;
  temperature: number;
  humidity: number;
  timestamp: string;
  excelFileName?: string;
}

export interface AlertLog {
  id: string;
  machineName: string;
  type: 'TEMPERATURE' | 'HUMIDITY';
  value: number;
  threshold: number;
  timestamp: string;
  emailSent: boolean;
  emailError?: string;
}

export interface SystemSettings {
  smtp_host: string;
  smtp_port: string;
  smtp_user: string;
  smtp_pass: string;
  smtp_secure: string;
  alert_email: string;
}

// Check and initialize default data if not exists
export function initClientDb() {
  if (typeof window === 'undefined') return;

  if (!localStorage.getItem('tt_initialized')) {
    // 1. Initial user
    localStorage.setItem('tt_user_username', 'admin');
    localStorage.setItem('tt_user_password', 'Admin123!'); // For local demo comparison

    // 2. Initial machines
    const initialMachines: Machine[] = [
      {
        id: 'm1',
        name: 'Makine-01',
        location: 'Bölüm A - Enjeksiyon',
        threshold: { maxTemperature: 40.0, minTemperature: 15.0, maxHumidity: 80.0, minHumidity: 20.0 },
        readings: []
      },
      {
        id: 'm2',
        name: 'Makine-02',
        location: 'Bölüm B - Montaj',
        threshold: { maxTemperature: 40.0, minTemperature: 15.0, maxHumidity: 80.0, minHumidity: 20.0 },
        readings: []
      },
      {
        id: 'm3',
        name: 'Makine-03',
        location: 'Bölüm C - Ambalaj',
        threshold: { maxTemperature: 40.0, minTemperature: 15.0, maxHumidity: 80.0, minHumidity: 20.0 },
        readings: []
      }
    ];
    localStorage.setItem('tt_machines', JSON.stringify(initialMachines));

    // 3. Initial settings
    const initialSettings: SystemSettings = {
      smtp_host: 'smtp.gmail.com',
      smtp_port: '587',
      smtp_user: 'erenaoyunda@gmail.com',
      smtp_pass: 'fujtdllqonpzocfi',
      smtp_secure: 'false',
      alert_email: 'erenaoyunda@gmail.com'
    };
    localStorage.setItem('tt_settings', JSON.stringify(initialSettings));

    // 4. Initial alerts
    localStorage.setItem('tt_alerts', JSON.stringify([]));

    localStorage.setItem('tt_initialized', 'true');
    console.log('Client-side LocalStorage DB Initialized!');
  }
}

// Get all machines
export function getClientMachines(): Machine[] {
  initClientDb();
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('tt_machines');
  return data ? JSON.parse(data) : [];
}

// Save machine thresholds/location
export function saveClientMachine(updatedMachine: any) {
  if (typeof window === 'undefined') return;
  const machines = getClientMachines();
  const index = machines.findIndex(m => m.id === updatedMachine.id);
  
  if (index !== -1) {
    machines[index] = {
      ...machines[index],
      name: updatedMachine.name,
      location: updatedMachine.location,
      threshold: {
        maxTemperature: Number(updatedMachine.maxTemperature),
        minTemperature: Number(updatedMachine.minTemperature),
        maxHumidity: Number(updatedMachine.maxHumidity),
        minHumidity: Number(updatedMachine.minHumidity),
      }
    };
    localStorage.setItem('tt_machines', JSON.stringify(machines));
  }
}

// Add or find machine by name
export function findOrCreateClientMachine(name: string): Machine {
  if (typeof window === 'undefined') {
    return { id: '', name: '', location: '', threshold: { maxTemperature: 40, minTemperature: 15, maxHumidity: 80, minHumidity: 20 }, readings: [] };
  }
  const machines = getClientMachines();
  let machine = machines.find(m => m.name.toLowerCase() === name.toLowerCase());

  if (!machine) {
    machine = {
      id: 'm_' + Math.random().toString(36).substring(2, 9),
      name,
      location: '',
      threshold: { maxTemperature: 40.0, minTemperature: 15.0, maxHumidity: 80.0, minHumidity: 20.0 },
      readings: []
    };
    machines.push(machine);
    localStorage.setItem('tt_machines', JSON.stringify(machines));
  }

  return machine;
}

// Add a reading
export function addClientReading(machineId: string, temperature: number, humidity: number, timestamp: string, fileName?: string) {
  if (typeof window === 'undefined') return;
  const machines = getClientMachines();
  const index = machines.findIndex(m => m.id === machineId);

  if (index !== -1) {
    const newReading: Reading = {
      id: 'r_' + Math.random().toString(36).substring(2, 9),
      machineId,
      temperature,
      humidity,
      timestamp,
      excelFileName: fileName
    };
    
    // Add to readings list (keep last 50 for limit)
    machines[index].readings = [newReading, ...machines[index].readings].slice(0, 50);
    localStorage.setItem('tt_machines', JSON.stringify(machines));
    return newReading;
  }
}

// Get alert logs
export function getClientAlerts(): AlertLog[] {
  initClientDb();
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem('tt_alerts');
  return data ? JSON.parse(data) : [];
}

// Add alert log
export function addClientAlert(alert: Omit<AlertLog, 'id'>) {
  if (typeof window === 'undefined') return;
  const alerts = getClientAlerts();
  const newAlert = {
    ...alert,
    id: 'a_' + Math.random().toString(36).substring(2, 9)
  };
  
  alerts.unshift(newAlert);
  // Keep last 100 alerts
  localStorage.setItem('tt_alerts', JSON.stringify(alerts.slice(0, 100)));
}

// Get settings
export function getClientSettings(): SystemSettings {
  initClientDb();
  if (typeof window === 'undefined') {
    return { smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_secure: '', alert_email: '' };
  }
  const data = localStorage.getItem('tt_settings');
  return data ? JSON.parse(data) : { smtp_host: '', smtp_port: '', smtp_user: '', smtp_pass: '', smtp_secure: '', alert_email: '' };
}

// Save settings
export function saveClientSettings(settings: SystemSettings) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('tt_settings', JSON.stringify(settings));
}

// Get stats
export function getClientStats() {
  const machines = getClientMachines();
  const alerts = getClientAlerts();

  // Recent alerts (24 hours)
  const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
  const recentAlerts = alerts.filter(a => new Date(a.timestamp).getTime() >= oneDayAgo).length;

  let tempSum = 0;
  let humiditySum = 0;
  let activeCount = 0;

  for (const m of machines) {
    if (m.readings.length > 0) {
      tempSum += m.readings[0].temperature;
      humiditySum += m.readings[0].humidity;
      activeCount++;
    }
  }

  return {
    totalMachines: machines.length,
    totalAlerts: alerts.length,
    recentAlerts,
    avgTemperature: activeCount > 0 ? Number((tempSum / activeCount).toFixed(1)) : 0,
    avgHumidity: activeCount > 0 ? Number((humiditySum / activeCount).toFixed(1)) : 0,
    activeMachines: activeCount
  };
}
