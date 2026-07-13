import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/auth';

export async function POST() {
  try {
    await clearAuthCookie();
    return NextResponse.json({ success: true, message: 'Başarıyla çıkış yapıldı.' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Çıkış işlemi sırasında sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
