import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    // Get machines with their thresholds and the latest reading
    const machines = await prisma.machine.findMany({
      include: {
        threshold: true,
        readings: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    return NextResponse.json(
      { error: 'Makineler listelenirken hata oluştu.' },
      { status: 500 }
    );
  }
}

// Support updating thresholds or locations for a specific machine
export async function PUT(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { id, name, location, maxTemperature, minTemperature, maxHumidity, minHumidity } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Makine ID gereklidir.' }, { status: 400 });
    }

    // Update location and threshold in a transaction
    const updated = await prisma.$transaction(async (tx: any) => {
      // Update machine
      const m = await tx.machine.update({
        where: { id },
        data: {
          name,
          location,
        },
      });

      // Update or create threshold
      const t = await tx.threshold.upsert({
        where: { machineId: id },
        update: {
          maxTemperature: Number(maxTemperature),
          minTemperature: Number(minTemperature),
          maxHumidity: Number(maxHumidity),
          minHumidity: Number(minHumidity),
        },
        create: {
          machineId: id,
          maxTemperature: Number(maxTemperature),
          minTemperature: Number(minTemperature),
          maxHumidity: Number(maxHumidity),
          minHumidity: Number(minHumidity),
        },
      });

      return { ...m, threshold: t };
    });

    return NextResponse.json({ success: true, machine: updated });
  } catch (error: any) {
    console.error('Error updating machine details:', error);
    return NextResponse.json(
      { error: 'Cihaz ayarları güncellenirken hata oluştu: ' + error.message },
      { status: 500 }
    );
  }
}
