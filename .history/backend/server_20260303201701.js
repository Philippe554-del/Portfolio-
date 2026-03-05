require('dotenv').config();

const express   = require('express');
const mysql     = require('mysql2/promise');
const bcrypt    = require('bcrypt');
const jwt       = require('jsonwebtoken');
const cors      = require('cors');
const rateLimit = require('express-rate-limit');
const helmet    = require('helmet');
const validator = require('validator');
const path      = require('path');
const crypto    = require('crypto');
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('ERREUR : JWT_SECRET absent ou trop court (32 caractères minimum).');
  process.exit(1);
}

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://www.gstatic.com', 'https://www.googletagmanager.com'],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'https://ui-avatars.com', 'https://img.icons8.com', 'https:'],
      connectSrc:  ["'self'", 'https://cdn.jsdelivr.net', 'http://localhost:3000'],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'same-origin' },
  crossOriginEmbedderPolicy: false,
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    return cb(new Error('Origine non autorisée'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 10 minutes.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives de connexion.' }
});

const globalLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false
});

app.use(globalLimiter);

let pool;

async function connectDB() {
  const sslConfig = process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  pool = mysql.createPool({
    host:               process.env.DB_HOST     || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306'),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME     || 'portfolio_db',
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    ssl:                sslConfig,
    timezone:           'Z'
  });

  const conn = await pool.getConnection();
  conn.release();

  await createTables();
  console.log('Base de données connectée.');
}

async function createTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      email      VARCHAR(254) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id         INT AUTO_INCREMENT PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(254) NOT NULL,
      phone      VARCHAR(20),
      message    TEXT NOT NULL,
      ip_address VARCHAR(45),
      is_read    TINYINT(1)   DEFAULT 0,
      replied_at TIMESTAMP    NULL DEFAULT NULL,
      created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM admin_users');
  if (rows[0].n === 0) {
    console.log('\nAucun compte admin détecté. Lancez : npm run setup\n');
  }
}

function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }
  try {
    req.admin = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Session expirée.' });
  }
}

function sanitize(val, max) {
  return validator.escape(String(val || '').trim()).slice(0, max);
}

function clientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 45);
}

function parsePositiveInt(val, def, min, max) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

/* ---- Routes publiques ---- */

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', ts: Date.now() });
});

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const name    = sanitize(req.body.name,    100);
    const email   = sanitize(req.body.email,   254);
    const phone   = sanitize(req.body.phone,    20);
    const message = sanitize(req.body.message, 2000);

    if (name.length < 2)           return res.status(400).json({ error: 'Nom trop court.' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'Email invalide.' });
    if (message.length < 10)       return res.status(400).json({ error: 'Message trop court.' });
    if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) {
      return res.status(400).json({ error: 'Numéro invalide.' });
    }

    await pool.execute(
      'INSERT INTO messages (name, email, phone, message, ip_address) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, message, clientIP(req)]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('contact:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const email    = sanitize(req.body.email, 254);
    const password = String(req.body.password || '').slice(0, 128);

    if (!email || !password) {
      return res.status(400).json({ error: 'Champs requis.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, email, password FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    /* Timing constant pour éviter l'énumération des comptes */
    const dummyHash = '$2b$12$invalidhashfortimingatttackXXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hash      = rows.length ? rows[0].password : dummyHash;
    const valid     = await bcrypt.compare(password, hash);

    if (!rows.length || !valid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '8h', issuer: 'portfolio-admin' }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error('login:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ---- Routes protégées ---- */

app.get('/api/admin/messages', auth, async (req, res) => {
  try {
    const page   = parsePositiveInt(req.query.page,  1,  1, 9999);
    const limit  = parsePositiveInt(req.query.limit, 20, 1, 100);
    const offset = (page - 1) * limit;
    const filter = req.query.filter;

    let where = '';
    const params = [];
    if (filter === 'read')   { where = 'WHERE is_read = 1'; }
    if (filter === 'unread') { where = 'WHERE is_read = 0'; }

    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM messages ${where}`, params);
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, message, is_read, replied_at, created_at
       FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ success: true, messages: rows, total, page, limit });
  } catch (err) {
    console.error('messages:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.get('/api/admin/stats', auth, async (req, res) => {
  try {
    const [[{ total }]]   = await pool.execute('SELECT COUNT(*) AS total FROM messages');
    const [[{ read }]]    = await pool.execute('SELECT COUNT(*) AS read FROM messages WHERE is_read = 1');
    const [[{ unread }]]  = await pool.execute('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0');
    const [[{ today }]]   = await pool.execute("SELECT COUNT(*) AS today FROM messages WHERE DATE(created_at) = CURDATE()");
    const [[{ replied }]] = await pool.execute('SELECT COUNT(*) AS replied FROM messages WHERE replied_at IS NOT NULL');
    const [daily]         = await pool.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM messages
       WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({ success: true, stats: { total, read, unread, today, replied, daily } });
  } catch (err) {
    console.error('stats:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.patch('/api/admin/messages/read-all', auth, async (req, res) => {
  try {
    await pool.execute('UPDATE messages SET is_read = 1 WHERE is_read = 0');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.patch('/api/admin/messages/:id/read', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const [rows] = await pool.execute('SELECT is_read FROM messages WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Message introuvable.' });

    const newVal = rows[0].is_read ? 0 : 1;
    await pool.execute('UPDATE messages SET is_read = ? WHERE id = ?', [newVal, id]);
    res.json({ success: true, is_read: !!newVal });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.patch('/api/admin/messages/:id/replied', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    await pool.execute('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/messages/:id', auth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const [result] = await pool.execute('DELETE FROM messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Message introuvable.' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.delete('/api/admin/messages', auth, async (req, res) => {
  try {
    const type = req.query.type;
    if (type === 'read')     await pool.execute('DELETE FROM messages WHERE is_read = 1');
    else if (type === 'all') await pool.execute('DELETE FROM messages');
    else return res.status(400).json({ error: 'Type invalide. Utilisez ?type=read ou ?type=all' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

app.post('/api/admin/change-password', auth, async (req, res) => {
  try {
    const current = String(req.body.current || '').slice(0, 128);
    const next    = String(req.body.next    || '').slice(0, 128);

    if (!current || !next)  return res.status(400).json({ error: 'Champs requis.' });
    if (next.length < 8)    return res.status(400).json({ error: 'Mot de passe trop court (8 caractères min).' });
    if (current === next)   return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent.' });

    const [rows] = await pool.execute('SELECT password FROM admin_users WHERE id = ?', [req.admin.id]);
    if (!rows.length) return res.status(404).json({ error: 'Compte introuvable.' });

    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

    const hash = await bcrypt.hash(next, 12);
    await pool.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.admin.id]);

    res.json({ success: true });
  } catch (err) {
    console.error('change-password:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ---- Envoi email de réponse ---- */

app.post('/api/admin/send-reply', auth, async (req, res) => {
  try {
    const to      = sanitize(req.body.to,      254);
    const subject = sanitize(req.body.subject, 200);
    const message = String(req.body.message || '').slice(0, 5000);
    const msgId   = parseInt(req.body.messageId, 10);

    if (!validator.isEmail(to))    return res.status(400).json({ error: 'Email destinataire invalide.' });
    if (!subject)                   return res.status(400).json({ error: 'Sujet requis.' });
    if (message.length < 5)         return res.status(400).json({ error: 'Message trop court.' });

    // Créer le transporteur Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD
      }
    });

    await transporter.sendMail({
      from: `"Philippe Hountondji" <${process.env.GMAIL_USER}>`,
      to:   to,
      subject: subject,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
               <p>${message.replace(/\n/g, '<br>')}</p>
               <hr style="border:1px solid #eee;margin:20px 0">
               <p style="color:#888;font-size:12px">
                 Philippe Hountondji<br>
                 hountondjiphilippe58@gmail.com<br>
                 +229 01 58 15 69 30
               </p>
             </div>`
    });

    // Marquer comme répondu en base
    if (msgId && msgId > 0) {
      await pool.execute('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [msgId]);
    }

    res.json({ success: true, message: 'Email envoyé avec succès.' });
  } catch (err) {
    console.error('send-reply:', err.message);
    res.status(500).json({ error: 'Erreur envoi email : ' + err.message });
  }
});

/* ---- Fichiers statiques ---- */

// Servir l'admin
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), {
  etag: true,
  lastModified: true
}));

// Servir le frontend (racine)
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  etag: true,
  lastModified: true
}));

// Page d'accueil explicite
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ---- 404 / Erreurs ---- */

app.use((req, res) => {
  res.status(404).json({ error: 'Route introuvable.' });
});

app.use((err, req, res, next) => {
  console.error('unhandled:', err.message);
  res.status(500).json({ error: 'Erreur serveur.' });
});

/* ---- Démarrage ---- */

connectDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur démarré sur le port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Démarrage impossible :', err.message);
    process.exit(1);
  });