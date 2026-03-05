const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');

// Remplacer l'import nodemailer par resend
c = c.replace(
  "const nodemailer = require('nodemailer');",
  "const { Resend } = require('resend');"
);

// Remplacer la fonction d'envoi
c = c.replace(
  `    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      requireTLS: true,
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });
    const safeMessage = validator.escape(message).replace(/\\n/g, '<br>');
    await transporter.sendMail({
      from: \`"Philippe Hountondji" <\${process.env.GMAIL_USER}>\`,
      to, subject,
      text: message,
      html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>\${safeMessage}</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji — \${process.env.GMAIL_USER}</p></div>\`
    });`,
  `    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeMessage = validator.escape(message).replace(/\\n/g, '<br>');
    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to,
      subject,
      text: message,
      html: \`<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>\${safeMessage}</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji — hountondjiphilippe58@gmail.com</p></div>\`
    });`
);

fs.writeFileSync('backend/server.js', c);
console.log('done');
