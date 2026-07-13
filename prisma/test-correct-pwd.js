const nodemailer = require('nodemailer');

async function testGmail() {
  console.log('Testing Gmail SMTP with 16-character password WITHOUT spaces...');
  
  const smtpUser = 'erenaoyunda@gmail.com';
  const smtpPass = 'fujtdllqonpzocfi'; // 16 characters, no spaces

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
    tls: {
      rejectUnauthorized: false,
    },
    debug: true,
    logger: true,
  });

  try {
    console.log(`Sending test email from ${smtpUser} to ${smtpUser}`);
    const info = await transporter.sendMail({
      from: `"Isı Takip Testi" <${smtpUser}>`,
      to: smtpUser,
      subject: 'Correct SMTP Password Test',
      text: 'SMTP test with fujtdllqonpzocfi succeeded!',
    });
    console.log('SUCCESS! Message sent: %s', info.messageId);
  } catch (error) {
    console.error('FAILED! SMTP Error occurred:');
    console.error(error);
  }
}

testGmail();
