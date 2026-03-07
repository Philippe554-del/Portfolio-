const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// Remplacer l'import Resend par googleapis
c = c.replace(
  "const { Resend } = require('resend');",
  "const { google } = require('googleapis');"
);

// Remplacer la fonction d'envoi
c = c.replace(
  `    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeMessage = validator.escape(message).replace(/\\n/g, '<br>');
    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to,
      subject,
      text: message,
      html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>\${safeMessage}</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji — hountondjiphilippe58@gmail.com</p></div>\`
    });`,
  `    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground'
    );
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    const safeMessage = validator.escape(message).replace(/\\n/g, '<br>');
    const emailContent = [
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      \`To: \${to}\`,
      \`From: Philippe Hountondji <hountondjiphilippe58@gmail.com>\`,
      \`Subject: \${subject}\`,
      '',
      \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>\${safeMessage}</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji — hountondjiphilippe58@gmail.com</p></div>\`
    ].join('\\n');
    const encodedEmail = Buffer.from(emailContent).toString('base64').replace(/\\+/g, '-').replace(/\\//g, '_').replace(/=+$/, '');
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedEmail } });`
);

fs.writeFileSync('backend/server.js', c);
console.log('done');
