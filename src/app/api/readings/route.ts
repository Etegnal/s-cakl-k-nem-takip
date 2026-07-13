import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Yetkisiz erişim.' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const machineId = searchParams.get('machineId');
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 20;

    const queryOptions: any = {
      orderBy: { timestamp: 'desc' },
      take: limit,
      include: {
        machine: {
          select: { name: true, location: true },
        },
      },
    };

    if (machineId) {
      queryOptions.where = { machineId };
    }

    const readings = await prisma.reading.findMany(queryOptions);

    // Return chronological order for easy charting (reversing desc readings)
    return NextResponse.json(readings.reverse());
  } catch (error) {
    console.error('Readings fetch error:', error);
    return NextResponse.json(
      { error: 'Ölçüm geçmişi yüklenirken hata oluştu.' },
      { status: 500 }
    );
  }
}
