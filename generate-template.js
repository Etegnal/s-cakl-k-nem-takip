const xlsx = require('xlsx');
const path = require('path');

function generateTemplate() {
  console.log('Generating sample Excel template...');

  // Sample data: including both normal readings and boundary/breach readings for test
  const data = [
    {
      'Makine Adı': 'Makine-01',
      'Sıcaklık': 24.5,
      'Nem': 45.2,
      'Tarih': '2026-07-13 10:00:00'
    },
    {
      'Makine Adı': 'Makine-02',
      'Sıcaklık': 42.1, // Critical temperature breach (>40.0)
      'Nem': 55.0,
      'Tarih': '2026-07-13 10:05:00'
    },
    {
      'Makine Adı': 'Makine-03',
      'Sıcaklık': 22.0,
      'Nem': 85.4, // Critical humidity breach (>80.0)
      'Tarih': '2026-07-13 10:10:00'
    },
    {
      'Makine Adı': 'Makine-01',
      'Sıcaklık': 25.0,
      'Nem': 44.0,
      'Tarih': '2026-07-13 10:15:00'
    },
    {
      'Makine Adı': 'Makine-02',
      'Sıcaklık': 38.5, // High but normal
      'Nem': 78.0, // High but normal
      'Tarih': '2026-07-13 10:20:00'
    },
    {
      'Makine Adı': 'Makine-04', // A new machine that will be auto-created by the system
      'Sıcaklık': 28.0,
      'Nem': 50.0,
      'Tarih': '2026-07-13 10:25:00'
    }
  ];

  const workbook = xlsx.utils.book_new();
  const worksheet = xlsx.utils.json_to_sheet(data);
  
  xlsx.utils.book_append_sheet(workbook, worksheet, 'Sıcaklık ve Nem Verileri');

  const outputPath = path.join(__dirname, 'ornek_takip_verisi.xlsx');
  xlsx.writeFile(workbook, outputPath);

  console.log(`Successfully generated sample template at: ${outputPath}`);
}

generateTemplate();
