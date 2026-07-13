import nodemailer from 'nodemailer';
import { getSetting } from './settings';

interface EmailParams {
  machineName: string;
  location: string;
  type: 'TEMPERATURE' | 'HUMIDITY';
  value: number;
  threshold: number;
  timestamp: Date;
}

export async function sendAlertEmail(params: EmailParams): Promise<{ success: boolean; error?: string; logged?: boolean }> {
  try {
    const smtpHost = await getSetting('smtp_host');
    const smtpPort = await getSetting('smtp_port');
    const smtpUser = await getSetting('smtp_user');
    const smtpPass = await getSetting('smtp_pass');
    const smtpSecure = await getSetting('smtp_secure') === 'true';
    const alertEmail = await getSetting('alert_email');

    const formattedTime = new Date(params.timestamp).toLocaleString('tr-TR', {
      timeZone: 'Europe/Istanbul',
    });

    const isTemp = params.type === 'TEMPERATURE';
    const typeLabel = isTemp ? 'Sıcaklık' : 'Nem';
    const unit = isTemp ? '°C' : '%';
    const exceedType = params.value > params.threshold ? 'Yüksek' : 'Düşük';

    // Beautiful HTML email template
    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #0f172a;
            color: #e2e8f0;
            margin: 0;
            padding: 20px;
          }
          .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #1e293b;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            border: 1px solid #334155;
          }
          .header {
            background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .header h1 {
            color: #ffffff;
            margin: 0;
            font-size: 24px;
            font-weight: 700;
            letter-spacing: 0.5px;
          }
          .content {
            padding: 30px;
          }
          .alert-badge {
            background-color: rgba(239, 68, 68, 0.1);
            border: 1px solid #ef4444;
            color: #f87171;
            padding: 10px 15px;
            border-radius: 6px;
            font-weight: 600;
            margin-bottom: 25px;
            text-align: center;
            font-size: 16px;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 25px;
          }
          .details-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #334155;
          }
          .details-table td.label {
            font-weight: 600;
            color: #94a3b8;
            width: 35%;
          }
          .details-table td.value {
            color: #f8fafc;
            font-weight: 500;
          }
          .details-table td.highlight {
            color: #f87171;
            font-weight: 700;
            font-size: 18px;
          }
          .footer {
            background-color: #0f172a;
            padding: 20px;
            text-align: center;
            font-size: 12px;
            color: #64748b;
            border-top: 1px solid #334155;
          }
          .btn {
            display: inline-block;
            background-color: #3b82f6;
            color: #ffffff;
            text-decoration: none;
            padding: 12px 24px;
            border-radius: 6px;
            font-weight: 600;
            margin-top: 15px;
            text-align: center;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Kritik Aşım Bildirimi</h1>
          </div>
          <div class="content">
            <div class="alert-badge">
              ⚠️ ${params.machineName} cihazında Limit Aşımı Tespit Edildi!
            </div>
            <table class="details-table">
              <tr>
                <td class="label">Cihaz Adı:</td>
                <td class="value">${params.machineName}</td>
              </tr>
              <tr>
                <td class="label">Bölüm / Konum:</td>
                <td class="value">${params.location || 'Belirtilmemiş'}</td>
              </tr>
              <tr>
                <td class="label">Aşım Türü:</td>
                <td class="value">${typeLabel} (${exceedType})</td>
              </tr>
              <tr>
                <td class="label">Ölçülen Değer:</td>
                <td class="highlight">${params.value}${unit}</td>
              </tr>
              <tr>
                <td class="label">Belirlenen Limit:</td>
                <td class="value">${params.threshold}${unit}</td>
              </tr>
              <tr>
                <td class="label">Ölçüm Zamanı:</td>
                <td class="value">${formattedTime}</td>
              </tr>
            </table>
            <div style="text-align: center;">
              <p style="color: #94a3b8; font-size: 14px;">Detayları ve canlı verileri görüntülemek için takip sistemine giriş yapınız.</p>
              <a href="#" class="btn">Sisteme Git</a>
            </div>
          </div>
          <div class="footer">
            Bu e-posta Isı ve Nem Takip Sistemi tarafından otomatik olarak oluşturulmuştur.
          </div>
        </div>
      </body>
      </html>
    `;

    // If SMTP options are not fully set, simulate mail sending
    if (!smtpHost || !smtpUser || !smtpPass || !alertEmail) {
      console.log('--- E-POSTA GÖNDERİMİ SİMÜLE EDİLDİ ---');
      console.log(`Kime: ${alertEmail || '[Yapılandırılmamış Recipient]'}`);
      console.log(`Konu: CRITICAL: ${params.machineName} - ${typeLabel} Aşımı!`);
      console.log(`Detaylar: ${params.machineName} (${params.location}) -> Ölçülen: ${params.value}${unit}, Eşik: ${params.threshold}${unit}`);
      console.log('----------------------------------------');
      return { success: true, logged: true };
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
      tls: {
        rejectUnauthorized: false, // Prevents certificate verification errors in dev environments
      },
      connectionTimeout: 10000, // 10 saniye limit
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from: `"Isı Nem Takip Sistemi" <${smtpUser}>`,
      to: alertEmail,
      subject: `⚠️ CRITICAL: ${params.machineName} - ${typeLabel} Aşımı!`,
      html: emailHtml,
    });

    return { success: true };
  } catch (error: any) {
    console.error('Mail sending error:', error);
    return { success: false, error: error.message || 'Bilinmeyen e-posta gönderme hatası.' };
  }
}
