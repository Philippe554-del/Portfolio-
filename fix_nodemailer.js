const fs = require('fs');
let c = fs.readFileSync('backend/server.js', 'utf8');
c = c.replace(
  "service: 'gmail',\n      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }",
  "host: 'smtp.gmail.com',\n      port: 465,\n      secure: true,\n      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }"
);
fs.writeFileSync('backend/server.js', c);
console.log('done');
