import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getAllSettings, updateSetting, getSetting } from '@/lib/settings';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const settings = await getAllSettings();
    return NextResponse.json(settings);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return NextResponse.json(
      { error: 'Sistem ayarları yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const body = await request.json();
    const { testSmtp, smtp_host, smtp_port, smtp_user, smtp_pass, smtp_secure, alert_email } = body;

    let smtp_pass_clean = smtp_pass;
    if (smtp_pass && smtp_pass !== '********') {
      smtp_pass_clean = smtp_pass.replace(/\s+/g, '');
    }

    // If it's an SMTP test operation
    if (testSmtp) {
      if (!smtp_host || !smtp_user || !alert_email) {
        return NextResponse.json(
          { error: 'Test e-postası göndermek için Sunucu, Kullanıcı Adı ve Alıcı E-posta alanları zorunludur.' },
          { status: 400 }
        );
      }

      // Determine password (use new one, or fall back to DB if password was masked as '********')
      let passwordToUse = smtp_pass_clean;
      if (smtp_pass_clean === '********') {
        passwordToUse = await getSetting('smtp_pass');
      }

      try {
        const transporter = nodemailer.createTransport({
          host: smtp_host,
          port: Number(smtp_port),
          secure: smtp_secure === 'true' || smtp_secure === true,
          auth: {
            user: smtp_user,
            pass: passwordToUse,
          },
          tls: {
            rejectUnauthorized: false,
          },
          connectionTimeout: 10000, // 10 saniye limit
          greetingTimeout: 10000,
          socketTimeout: 10000,
        });

        // Send a test mail
        await transporter.sendMail({
          from: `"Isı Nem Takip Testi" <${smtp_user}>`,
          to: alert_email,
          subject: '🔔 Isı ve Nem Takip Sistemi - SMTP Test E-postası',
          html: `
            <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; max-width: 500px; margin: auto;">
              <h2 style="color: #3b82f6; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">SMTP Bağlantı Testi Başarılı!</h2>
              <p>Merhaba,</p>
              <p>Bu e-posta, Isı ve Nem Takip Sistemi yönetim paneli üzerinden gönderilen başarılı bir <strong>SMTP Test E-postasıdır</strong>.</p>
              <p>Artık sisteminiz eşik sınır aşımı durumlarında bu e-posta adresi üzerinden uyarı göndermeye hazırdır.</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <p style="font-size: 12px; color: #64748b; text-align: center;">Isı ve Nem Takip Sistemi</p>
            </div>
          `,
        });

        return NextResponse.json({ success: true, message: 'Test e-postası başarıyla gönderildi.' });
      } catch (err: any) {
        console.error('SMTP Connection Test Error:', err);
        return NextResponse.json(
          { error: `SMTP Bağlantı Hatası: ${err.message || 'Bilinmeyen hata'}` },
          { status: 500 }
        );
      }
    }

    // Normal save operations
    const settingsToUpdate = {
      smtp_host,
      smtp_port,
      smtp_user,
      smtp_secure: String(smtp_secure),
      alert_email,
    };

    for (const [key, value] of Object.entries(settingsToUpdate)) {
      if (value !== undefined) {
        await updateSetting(key, value);
      }
    }

    // Only update password if it's not the masked placeholder
    if (smtp_pass_clean !== undefined && smtp_pass_clean !== '********' && smtp_pass_clean !== '') {
      await updateSetting('smtp_pass', smtp_pass_clean);
    }

    return NextResponse.json({ success: true, message: 'Ayarlar başarıyla kaydedildi.' });
  } catch (error: any) {
    console.error('Settings save error:', error);
    return NextResponse.json(
      { error: 'Ayarlar kaydedilirken sunucu hatası oluştu: ' + error.message },
      { status: 500 }
    );
  }
}
