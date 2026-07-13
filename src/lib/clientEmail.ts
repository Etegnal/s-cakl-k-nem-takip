// Client-side simulated & real email service (Web3Forms) for static deployment on GitHub Pages

interface ClientEmailParams {
  machineName: string;
  location: string;
  type: 'TEMPERATURE' | 'HUMIDITY';
  value: number;
  threshold: number;
  timestamp: string;
  recipientEmail: string;
  provider?: 'smtp' | 'web3forms';
  web3formsKey?: string;
}

export async function sendClientAlertEmail(params: ClientEmailParams): Promise<{ success: boolean; logged: boolean; error?: string }> {
  try {
    const isTemp = params.type === 'TEMPERATURE';
    const typeLabel = isTemp ? 'Sıcaklık' : 'Nem';
    const unit = isTemp ? '°C' : '%';
    const exceedType = params.value > params.threshold ? 'Yüksek' : 'Düşük';

    // 1. If Web3Forms provider is selected and access key is provided, send real email!
    if (params.provider === 'web3forms' && params.web3formsKey) {
      console.log('Sending real email via Web3Forms API to: ' + params.recipientEmail);
      
      const response = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          access_key: params.web3formsKey,
          subject: `⚠️ UYARI: ${params.machineName} - ${typeLabel} Aşımı!`,
          from_name: 'Isı Nem Takip Sistemi',
          to: params.recipientEmail,
          message: `
            Kritik Aşım Bildirimi
            --------------------
            Cihaz Adı: ${params.machineName}
            Konum: ${params.location || 'Belirtilmemiş'}
            Aşım Türü: ${typeLabel} (${exceedType})
            Ölçülen Değer: ${params.value}${unit}
            Belirlenen Limit: ${params.threshold}${unit}
            Zaman: ${new Date(params.timestamp).toLocaleString('tr-TR')}
            
            Canlı verileri izlemek için takip sistemine giriş yapınız.
          `
        })
      });

      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true, logged: false };
      } else {
        throw new Error(data.message || 'Web3Forms e-posta gönderimi başarısız oldu.');
      }
    }

    // 2. Otherwise fallback to client-side logging simulation
    console.log('%c--- E-POSTA GÖNDERİMİ SİMÜLE EDİLDİ (CLIENT-SIDE) ---', 'color: #ef4444; font-weight: bold;');
    console.log(`Gönderilen Mail: ${params.recipientEmail}`);
    console.log(`Konu: ⚠️ CRITICAL: ${params.machineName} - ${typeLabel} Aşımı!`);
    console.log(`Detaylar: ${params.machineName} (${params.location}) -> Ölçülen: ${params.value}${unit}, Eşik: ${params.threshold}${unit}`);
    console.log('----------------------------------------------------');

    return { success: true, logged: true };
  } catch (error: any) {
    console.error('Email send error:', error);
    return { success: false, logged: false, error: error.message || 'E-posta gönderim hatası.' };
  }
}
