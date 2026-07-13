import { NextResponse } from 'next/server';
import * as xlsx from 'xlsx';
import { prisma } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';
import { sendAlertEmail } from '@/lib/email';

export async function POST(request: Request) {
  try {
    // 1. Authenticate user
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Bu işlemi gerçekleştirmek için giriş yapmalısınız.' },
        { status: 401 }
      );
    }

    // 2. Parse Multipart Form Data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'Herhangi bir dosya yüklenmedi.' },
        { status: 400 }
      );
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // 3. Read Workbook using SheetJS
    // cellDates: true converts Excel serial dates to JS Date objects automatically
    const workbook = xlsx.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // raw: false makes SheetJS format values as strings if needed, but since we want numbers, we can use raw: true
    const rows = xlsx.utils.sheet_to_json<any>(worksheet, { raw: true });

    if (rows.length === 0) {
      return NextResponse.json(
        { error: 'Excel dosyası boş veya okunamadı.' },
        { status: 400 }
      );
    }

    // 4. Map columns dynamically
    const firstRow = rows[0];
    const keys = Object.keys(firstRow);

    // Find keys matching our target properties
    const machineKey = keys.find(k => /device|cihaz|makine|machine|ad|name/i.test(k));
    const tempKey = keys.find(k => /sicaklik|sıcaklık|isi|ısı|temp|temperature/i.test(k));
    const humidityKey = keys.find(k => /nem|humid|humidity/i.test(k));
    const dateKey = keys.find(k => /tarih|zaman|date|time|timestamp/i.test(k));

    if (!machineKey || !tempKey || !humidityKey) {
      return NextResponse.json(
        { 
          error: 'Geçersiz Excel formatı. Dosya en azından Makine Adı, Sıcaklık ve Nem kolonlarını içermelidir.',
          detectedHeaders: keys 
        },
        { status: 400 }
      );
    }

    const processedReadings = [];
    const alertsTriggered = [];

    // 5. Process each row
    for (const row of rows) {
      const rawMachineName = String(row[machineKey] || '').trim();
      const rawTemp = parseFloat(row[tempKey]);
      const rawHumidity = parseFloat(row[humidityKey]);
      
      if (!rawMachineName || isNaN(rawTemp) || isNaN(rawHumidity)) {
        continue; // Skip invalid rows
      }

      // Parse timestamp
      let timestamp = new Date();
      if (dateKey && row[dateKey]) {
        const val = row[dateKey];
        if (val instanceof Date) {
          timestamp = val;
        } else {
          const parsed = Date.parse(String(val));
          if (!isNaN(parsed)) {
            timestamp = new Date(parsed);
          }
        }
      }

      // Find or create machine
      let machine = await prisma.machine.findUnique({
        where: { name: rawMachineName },
        include: { threshold: true },
      });

      if (!machine) {
        machine = await prisma.machine.create({
          data: {
            name: rawMachineName,
            threshold: {
              create: {
                maxTemperature: 40.0,
                minTemperature: 15.0,
                maxHumidity: 80.0,
                minHumidity: 20.0,
              }
            }
          },
          include: { threshold: true },
        });
      }

      // Save reading to database
      const reading = await prisma.reading.create({
        data: {
          machineId: machine.id,
          temperature: rawTemp,
          humidity: rawHumidity,
          timestamp: timestamp,
          excelFileName: file.name,
        },
      });

      processedReadings.push({
        machineName: machine.name,
        temperature: rawTemp,
        humidity: rawHumidity,
        timestamp,
      });

      // Check thresholds
      const threshold = machine.threshold;
      if (threshold) {
        let isBreached = false;
        let breachType: 'TEMPERATURE' | 'HUMIDITY' = 'TEMPERATURE';
        let breachValue = 0;
        let breachLimit = 0;

        // Temperature Check
        if (rawTemp > threshold.maxTemperature) {
          isBreached = true;
          breachType = 'TEMPERATURE';
          breachValue = rawTemp;
          breachLimit = threshold.maxTemperature;
        } else if (rawTemp < threshold.minTemperature) {
          isBreached = true;
          breachType = 'TEMPERATURE';
          breachValue = rawTemp;
          breachLimit = threshold.minTemperature;
        }

        if (isBreached) {
          // Trigger Temperature Alert
          const emailResult = await sendAlertEmail({
            machineName: machine.name,
            location: machine.location || '',
            type: breachType,
            value: breachValue,
            threshold: breachLimit,
            timestamp: timestamp,
          });

          await prisma.alertLog.create({
            data: {
              machineId: machine.id,
              readingId: reading.id,
              type: breachType,
              value: breachValue,
              threshold: breachLimit,
              timestamp: timestamp,
              emailSent: emailResult.success,
              emailError: emailResult.error || (emailResult.logged ? 'E-posta simüle edildi (Loglandı)' : null),
            },
          });

          alertsTriggered.push({
            machineName: machine.name,
            type: breachType,
            value: breachValue,
            threshold: breachLimit,
            emailSent: emailResult.success,
          });
        }

        // Reset check state for Humidity
        isBreached = false;

        // Humidity Check
        if (rawHumidity > threshold.maxHumidity) {
          isBreached = true;
          breachType = 'HUMIDITY';
          breachValue = rawHumidity;
          breachLimit = threshold.maxHumidity;
        } else if (rawHumidity < threshold.minHumidity) {
          isBreached = true;
          breachType = 'HUMIDITY';
          breachValue = rawHumidity;
          breachLimit = threshold.minHumidity;
        }

        if (isBreached) {
          // Trigger Humidity Alert
          const emailResult = await sendAlertEmail({
            machineName: machine.name,
            location: machine.location || '',
            type: breachType,
            value: breachValue,
            threshold: breachLimit,
            timestamp: timestamp,
          });

          await prisma.alertLog.create({
            data: {
              machineId: machine.id,
              readingId: reading.id,
              type: breachType,
              value: breachValue,
              threshold: breachLimit,
              timestamp: timestamp,
              emailSent: emailResult.success,
              emailError: emailResult.error || (emailResult.logged ? 'E-posta simüle edildi (Loglandı)' : null),
            },
          });

          alertsTriggered.push({
            machineName: machine.name,
            type: breachType,
            value: breachValue,
            threshold: breachLimit,
            emailSent: emailResult.success,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${processedReadings.length} adet ölçüm başarıyla yüklendi.`,
      processedCount: processedReadings.length,
      alertsCount: alertsTriggered.length,
      alerts: alertsTriggered,
    });

  } catch (error: any) {
    console.error('File upload error:', error);
    return NextResponse.json(
      { error: 'Dosya yükleme veya veri işleme sırasında bir hata oluştu: ' + (error.message || '') },
      { status: 500 }
    );
  }
}
