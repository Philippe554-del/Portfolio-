require('dotenv').config();

const bcrypt   = require('bcrypt');
const mysql    = require('mysql2/promise');
const readline = require('readline');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

function askHidden(question) {
  return new Promise(resolve => {
    const stdin = process.stdin;
    process.stdout.write(question);
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding('utf8');

    let password = '';

    function handler(ch) {
      if (ch === '\n' || ch === '\r' || ch === '\u0003') {
        stdin.setRawMode(false);
        stdin.pause();
        stdin.removeListener('data', handler);
        process.stdout.write('\n');
        if (ch === '\u0003') { rl.close(); process.exit(0); }
        resolve(password);
      } else if (ch === '\u007f') {
        if (password.length > 0) {
          password = password.slice(0, -1);
          process.stdout.clearLine(0);
          process.stdout.cursorTo(0);
          process.stdout.write(question + '*'.repeat(password.length));
        }
      } else {
        password += ch;
        process.stdout.write('*');
      }
    }

    stdin.on('data', handler);
  });
}

function isValidEmail(email) {
  return /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/.test(email) && email.length <= 254;
}

async function main() {
  console.log('\n========================================');
  console.log('  Configuration du compte administrateur');
  console.log('========================================\n');
  console.log('Le mot de passe sera haché (bcrypt, coût 12).');
  console.log('Il ne sera jamais stocké en clair.\n');

  const email = (await ask('Email admin : ')).trim();

  if (!isValidEmail(email)) {
    console.error('\nErreur : email invalide.\n');
    rl.close();
    process.exit(1);
  }

  const password = await askHidden('Mot de passe (8 car. min) : ');

  if (password.length < 8) {
    console.error('\nErreur : mot de passe trop court.\n');
    rl.close();
    process.exit(1);
  }

  const confirm = await askHidden('Confirmer le mot de passe : ');

  if (password !== confirm) {
    console.error('\nErreur : les mots de passe ne correspondent pas.\n');
    rl.close();
    process.exit(1);
  }

  rl.close();

  console.log('\nHachage en cours...');
  const hash = await bcrypt.hash(password, 12);

  console.log('Connexion à la base de données...');

  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     parseInt(process.env.DB_PORT || '3306'),
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME     || 'portfolio_db'
  });

  await conn.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      email      VARCHAR(254) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await conn.execute('SELECT id FROM admin_users WHERE email = ?', [email]);

  if (rows.length > 0) {
    await conn.execute('UPDATE admin_users SET password = ? WHERE email = ?', [hash, email]);
    console.log(`\nMot de passe mis à jour pour : ${email}`);
  } else {
    await conn.execute('INSERT INTO admin_users (email, password) VALUES (?, ?)', [email, hash]);
    console.log(`\nCompte admin créé pour : ${email}`);
  }

  await conn.end();

  console.log('\n----------------------------------------');
  console.log('Fait. Le hash bcrypt est en base.');
  console.log('Le mot de passe en clair n\'existe plus.');
  console.log('----------------------------------------\n');
}

main().catch(err => {
  console.error('\nErreur :', err.message, '\n');
  process.exit(1);
});