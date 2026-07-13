import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    // 1. Total machines count
    const totalMachines = await prisma.machine.count();

    // 2. Total alerts count (ever triggered) and last 24h alerts
    const totalAlerts = await prisma.alertLog.count();
    
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentAlerts = await prisma.alertLog.count({
      where: {
        timestamp: { gte: oneDayAgo },
      },
    });

    // 3. Get latest reading of each machine to calculate current average temperature & humidity
    const machines = await prisma.machine.findMany({
      include: {
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
    });

    let tempSum = 0;
    let humiditySum = 0;
    let activeReadingsCount = 0;

    for (const m of machines) {
      if (m.readings.length > 0) {
        tempSum += m.readings[0].temperature;
        humiditySum += m.readings[0].humidity;
        activeReadingsCount++;
      }
    }

    const avgTemperature = activeReadingsCount > 0 ? Number((tempSum / activeReadingsCount).toFixed(1)) : 0;
    const avgHumidity = activeReadingsCount > 0 ? Number((humiditySum / activeReadingsCount).toFixed(1)) : 0;

    return NextResponse.json({
      totalMachines,
      totalAlerts,
      recentAlerts,
      avgTemperature,
      avgHumidity,
      activeMachines: activeReadingsCount,
    });
  } catch (error) {
    console.error('Stats fetch error:', error);
    return NextResponse.json(
      { error: 'İstatistikler alınırken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
