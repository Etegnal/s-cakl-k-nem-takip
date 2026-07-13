// Client-side simulated email service for static deployment on GitHub Pages

interface ClientEmailParams {
  machineName: string;
  location: string;
  type: 'TEMPERATURE' | 'HUMIDITY';
  value: number;
  threshold: number;
  timestamp: string;
  recipientEmail: string;
}

export async function sendClientAlertEmail(params: ClientEmailParams): Promise<{ success: boolean; logged: boolean; error?: string }> {
  try {
    const isTemp = params.type === 'TEMPERATURE';
    const typeLabel = isTemp ? 'Sıcaklık' : 'Nem';
    const unit = isTemp ? '°C' : '%';
    const exceedType = params.value > params.threshold ? 'Yüksek' : 'Düşük';

    console.log('%c--- E-POSTA GÖNDERİMİ SİMÜLE EDİLDİ (CLIENT-SIDE) ---', 'color: #ef4444; font-weight: bold;');
    console.log(`Gönderilen Mail: ${params.recipientEmail}`);
    console.log(`Konu: ⚠️ CRITICAL: ${params.machineName} - ${typeLabel} Aşımı!`);
    console.log(`Detaylar: ${params.machineName} (${params.location}) -> Ölçülen: ${params.value}${unit}, Eşik: ${params.threshold}${unit}`);
    console.log('----------------------------------------------------');

    // Here we can easily integrate Web3Forms or another service if needed in the future.
    // For now, we simulate success immediately in the browser.
    return { success: true, logged: true };
  } catch (error: any) {
    return { success: false, logged: false, error: error.message || 'E-posta simülasyon hatası.' };
  }
}
