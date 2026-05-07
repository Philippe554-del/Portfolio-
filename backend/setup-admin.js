require('dotenv').config();

const bcrypt   = require('bcrypt');
const { Pool } = require('pg');
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

function isStrongPassword(pwd) {
  // Minimum 16 chars, au moins 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole
  if (pwd.length < 16) return false;
  if (!/[A-Z]/.test(pwd)) return false;
  if (!/[a-z]/.test(pwd)) return false;
  if (!/[0-9]/.test(pwd)) return false;
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd)) return false;
  return true;
}

async function main() {
  console.log('\n========================================');
  console.log('  Configuration du compte administrateur');
  console.log('========================================\n');
  
  // Vérifier les variables requises
  if (!process.env.DATABASE_URL) {
    console.error('ERREUR : DATABASE_URL non défini dans .env');
    rl.close();
    process.exit(1);
  }

  console.log('Le mot de passe sera haché (bcrypt, coût 14).');
  console.log('Il ne sera jamais stocké en clair.\n');

  const email = (await ask('Email admin : ')).trim();

  if (!isValidEmail(email)) {
    console.error('\nErreur : email invalide.\n');
    rl.close();
    process.exit(1);
  }

  const password = await askHidden('Mot de passe (16 car. min - majuscule, chiffre, symbole) : ');

  if (!isStrongPassword(password)) {
    console.error('\nErreur : mot de passe faible.');
    console.error('Requis : minimum 16 caractères, 1 majuscule, 1 minuscule, 1 chiffre, 1 symbole.\n');
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
  const hash = await bcrypt.hash(password, 14);

  console.log('Connexion à la base de données PostgreSQL...');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Créer la table si elle n'existe pas
    await pool.query(`
      CREATE TABLE IF NOT EXISTS admin_users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(254) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `);

    // Vérifier si l'email existe déjà
    const result = await pool.query('SELECT id FROM admin_users WHERE email = $1', [email]);

    if (result.rows.length > 0) {
      await pool.query('UPDATE admin_users SET password = $1, updated_at = NOW() WHERE email = $2', [hash, email]);
      console.log(`\nMot de passe mis à jour pour : ${email}`);
    } else {
      await pool.query('INSERT INTO admin_users (email, password) VALUES ($1, $2)', [email, hash]);
      console.log(`\nCompte admin créé pour : ${email}`);
    }

    console.log('Configuration terminée avec succès.\n');
  } catch (err) {
    console.error('\nErreur :', err.message);
  } finally {
    await pool.end();
  }
}

main().catch(err => {
  console.error('\nErreur fatale :', err.message);
  process.exit(1);
});