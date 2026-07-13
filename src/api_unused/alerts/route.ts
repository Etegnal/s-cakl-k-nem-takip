import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const alerts = await prisma.alertLog.findMany({
      include: {
        machine: {
          select: { name: true, location: true },
        },
        reading: {
          select: { temperature: true, humidity: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      take: 50,
    });

    return NextResponse.json(alerts);
  } catch (error) {
    console.error('Alerts fetch error:', error);
    return NextResponse.json(
      { error: 'Uyarı geçmişi yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
