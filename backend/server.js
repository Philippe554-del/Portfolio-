require('dotenv').config();

const express    = require('express');
const { Pool }   = require('pg');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');
const validator  = require('validator');
const path       = require('path');
const crypto     = require('crypto');


const app  = express();
const PORT = process.env.PORT || 3000;

['JWT_SECRET', 'DATABASE_URL'].forEach(function (key) {
  if (!process.env[key]) { console.error('ERREUR FATALE : variable manquante → ' + key); process.exit(1); }
});
if (process.env.JWT_SECRET.length < 32) {
  console.error('ERREUR FATALE : JWT_SECRET trop court (32 caractères minimum).'); process.exit(1);
}

app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc:  ["'self'", "'unsafe-inline'", 'https://cdnjs.cloudflare.com', 'https://cdn.jsdelivr.net', 'https://www.googletagmanager.com', 'https://www.google-analytics.com'],
      styleSrc:   ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc:    ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc:     ["'self'", 'data:', 'https://ui-avatars.com', 'https://img.icons8.com', 'https:'],
      connectSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://www.google-analytics.com', 'https://analytics.google.com', 'https://www.googletagmanager.com', 'https://region1.google-analytics.com'],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  hsts: process.env.NODE_ENV === 'production' ? { maxAge: 63072000, includeSubDomains: true, preload: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: false, limit: '10mb' }));

const originesParDefaut = [
  'https://philippe554-del.github.io',
  'https://hountondji-philippe.github.io',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:3000',
];
const originesEnv = (process.env.ALLOWED_ORIGINS || '').split(',').map(function(s) { return s.trim(); }).filter(Boolean);
const allowedOrigins = originesParDefaut.concat(originesEnv);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origine CORS refusée.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 600
}));

const isDev = process.env.NODE_ENV !== 'production';
app.use(rateLimit({ windowMs: 60000, max: isDev ? 2000 : 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requêtes.' } }));
const contactLimiter = rateLimit({ windowMs: 600000, max: isDev ? 100 : 5,   standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives.' } });
const loginLimiter   = rateLimit({ windowMs: 900000, max: isDev ? 100 : 10,  skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de tentatives.' } });
const adminLimiter   = rateLimit({ windowMs: 900000, max: isDev ? 2000 : 200, standardHeaders: true, legacyHeaders: false });

let pool;

async function connectDB() {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  });
  await pool.query('SELECT 1');
  await createTables();
  console.log('[DB] Connectée.');
}

async function createTables() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id         SERIAL PRIMARY KEY,
      email      VARCHAR(254) NOT NULL UNIQUE,
      password   VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id         SERIAL PRIMARY KEY,
      name       VARCHAR(100) NOT NULL,
      email      VARCHAR(254) NOT NULL,
      phone      VARCHAR(20),
      message    TEXT NOT NULL,
      ip_address VARCHAR(45),
      is_read    SMALLINT DEFAULT 0,
      replied_at TIMESTAMP NULL DEFAULT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti        VARCHAR(128) PRIMARY KEY,
      revoked_at TIMESTAMP DEFAULT NOW(),
      expires_at TIMESTAMP NOT NULL
    )
  `);

  // Table projets
  await pool.query(`
    CREATE TABLE IF NOT EXISTS projets (
      id          SERIAL PRIMARY KEY,
      titre       VARCHAR(200) NOT NULL,
      description TEXT NOT NULL,
      technologies VARCHAR(500),
      lien_site   VARCHAR(500),
      lien_github VARCHAR(500),
      image_url   VARCHAR(500),
      etiquette   VARCHAR(100) DEFAULT 'Projet',
      statut      VARCHAR(50)  DEFAULT 'termine',
      ordre       INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  // Table expériences
  await pool.query(`
    CREATE TABLE IF NOT EXISTS experiences (
      id          SERIAL PRIMARY KEY,
      titre       VARCHAR(200) NOT NULL,
      type_exp    VARCHAR(100),
      entreprise  VARCHAR(200),
      lieu        VARCHAR(200),
      date_debut  VARCHAR(100),
      date_fin    VARCHAR(100),
      description TEXT,
      tags        VARCHAR(500),
      statut      VARCHAR(50) DEFAULT 'termine',
      ordre       INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  // Table compétences
  await pool.query(`
    CREATE TABLE IF NOT EXISTS competences (
      id          SERIAL PRIMARY KEY,
      categorie   VARCHAR(200) NOT NULL,
      icone       VARCHAR(100) DEFAULT 'fas fa-code',
      couleur     VARCHAR(200) DEFAULT 'linear-gradient(135deg,#667eea,#764ba2)',
      niveau      INTEGER DEFAULT 70,
      label_niveau VARCHAR(100) DEFAULT 'Intermédiaire',
      items       TEXT,
      ordre       INTEGER DEFAULT 0,
      created_at  TIMESTAMP DEFAULT NOW(),
      updated_at  TIMESTAMP DEFAULT NOW()
    )
  `);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_created  ON messages (created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_is_read  ON messages (is_read)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_revoked_expires   ON revoked_tokens (expires_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_projets_ordre     ON projets (ordre)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_experiences_ordre ON experiences (ordre)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_competences_ordre ON competences (ordre)`);

  await pool.query(`DELETE FROM revoked_tokens WHERE expires_at < NOW()`);
  const res = await pool.query('SELECT COUNT(*) AS n FROM admin_users');
  if (parseInt(res.rows[0].n) === 0) console.log('\n[SETUP] Aucun compte admin. Appelez /api/admin/init\n');
}

function sanitize(val, max) { return validator.escape(String(val || '').trim()).slice(0, max); }
function clientIP(req) { return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 45); }
function parsePositiveInt(val, def, min, max) { const n = parseInt(val, 10); if (isNaN(n)) return def; return Math.min(max, Math.max(min, n)); }
function generateJti() { return crypto.randomBytes(32).toString('hex'); }

async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé.' });
  const token = header.slice(7);
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Session expirée.' : 'Token invalide.' });
  }
  try {
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1 LIMIT 1', [payload.jti]);
    if (r.rows.length > 0) return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
  req.admin = payload;
  next();
}

// ── HEALTH ────────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// ── CONTACT ───────────────────────────────────────────────────────────────

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const name    = sanitize(req.body.name,    100);
    const email   = sanitize(req.body.email,   254);
    const phone   = sanitize(req.body.phone,    20);
    const message = sanitize(req.body.message, 2000);
    if (name.length < 2)           return res.status(400).json({ error: 'Nom invalide.' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'Email invalide.' });
    if (message.length < 10)       return res.status(400).json({ error: 'Message trop court.' });
    if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) return res.status(400).json({ error: 'Numéro invalide.' });
    await pool.query('INSERT INTO messages (name, email, phone, message, ip_address) VALUES ($1, $2, $3, $4, $5)',
      [name, email, phone || null, message, clientIP(req)]);
    res.json({ success: true });
  } catch (err) { console.error('[contact]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── AUTH ADMIN ────────────────────────────────────────────────────────────

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const email    = sanitize(req.body.email, 254);
    const password = String(req.body.password || '').slice(0, 128);
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
    if (!validator.isEmail(email)) {
      await bcrypt.compare('dummy', '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const r    = await pool.query('SELECT id, email, password FROM admin_users WHERE email = $1 LIMIT 1', [email]);
    const hash = r.rows.length ? r.rows[0].password : '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX';
    const valid = await bcrypt.compare(password, hash);
    if (!r.rows.length || !valid) return res.status(401).json({ error: 'Identifiants incorrects.' });
    const jti   = generateJti();
    const token = jwt.sign({ id: r.rows[0].id, email: r.rows[0].email, jti }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token });
  } catch (err) { console.error('[login]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/logout', auth, async (req, res) => {
  try {
    await pool.query('INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.admin.jti, new Date(req.admin.exp * 1000)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── MESSAGES ──────────────────────────────────────────────────────────────

app.get('/api/admin/messages', auth, adminLimiter, async (req, res) => {
  try {
    const page   = parsePositiveInt(req.query.page,  1,  1, 9999);
    const limit  = parsePositiveInt(req.query.limit, 20, 1, 200);
    const offset = (page - 1) * limit;
    const filter = req.query.filter;
    let where = '';
    if (filter === 'read')   where = 'WHERE is_read = 1';
    if (filter === 'unread') where = 'WHERE is_read = 0';
    const total = await pool.query(`SELECT COUNT(*) AS total FROM messages ${where}`);
    const rows  = await pool.query(`SELECT id, name, email, phone, message, is_read, replied_at, created_at FROM messages ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`, [limit, offset]);
    res.json({ success: true, messages: rows.rows, total: parseInt(total.rows[0].total), page, limit });
  } catch (err) { console.error('[messages]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.get('/api/admin/stats', auth, adminLimiter, async (req, res) => {
  try {
    const total   = await pool.query('SELECT COUNT(*) AS total FROM messages');
    const read    = await pool.query('SELECT COUNT(*) AS read FROM messages WHERE is_read = 1');
    const unread  = await pool.query('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0');
    const today   = await pool.query("SELECT COUNT(*) AS today FROM messages WHERE created_at::date = NOW()::date");
    const replied = await pool.query('SELECT COUNT(*) AS replied FROM messages WHERE replied_at IS NOT NULL');
    const daily   = await pool.query("SELECT created_at::date AS date, COUNT(*) AS count FROM messages WHERE created_at >= NOW() - INTERVAL '7 days' GROUP BY created_at::date ORDER BY date ASC");
    res.json({ success: true, stats: {
      total:   parseInt(total.rows[0].total),
      read:    parseInt(read.rows[0].read),
      unread:  parseInt(unread.rows[0].unread),
      today:   parseInt(today.rows[0].today),
      replied: parseInt(replied.rows[0].replied),
      daily:   daily.rows
    }});
  } catch (err) { console.error('[stats]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.patch('/api/admin/messages/read-all', auth, adminLimiter, async (req, res) => {
  try { await pool.query('UPDATE messages SET is_read = 1 WHERE is_read = 0'); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.patch('/api/admin/messages/:id/read', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const r = await pool.query('SELECT is_read FROM messages WHERE id = $1 LIMIT 1', [id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Message introuvable.' });
    const newVal = r.rows[0].is_read ? 0 : 1;
    await pool.query('UPDATE messages SET is_read = $1 WHERE id = $2', [newVal, id]);
    res.json({ success: true, is_read: !!newVal });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.patch('/api/admin/messages/:id/replied', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    await pool.query('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/messages/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const r = await pool.query('DELETE FROM messages WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Message introuvable.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/messages', auth, adminLimiter, async (req, res) => {
  try {
    const type = req.query.type;
    if (type === 'read')     await pool.query('DELETE FROM messages WHERE is_read = 1');
    else if (type === 'all') await pool.query('DELETE FROM messages');
    else return res.status(400).json({ error: 'Utilisez ?type=read ou ?type=all' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/change-password', auth, adminLimiter, async (req, res) => {
  try {
    const current = String(req.body.current || '').slice(0, 128);
    const next    = String(req.body.next    || '').slice(0, 128);
    if (!current || !next) return res.status(400).json({ error: 'Les deux mots de passe sont requis.' });
    if (next.length < 12)  return res.status(400).json({ error: 'Mot de passe trop court (12 caractères min).' });
    if (current === next)  return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent.' });
    const r = await pool.query('SELECT password FROM admin_users WHERE id = $1 LIMIT 1', [req.admin.id]);
    if (!r.rows.length) return res.status(404).json({ error: 'Compte introuvable.' });
    const valid = await bcrypt.compare(current, r.rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    const hash = await bcrypt.hash(next, 14);
    await pool.query('UPDATE admin_users SET password = $1, updated_at = NOW() WHERE id = $2', [hash, req.admin.id]);
    await pool.query('INSERT INTO revoked_tokens (jti, expires_at) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [req.admin.jti, new Date(req.admin.exp * 1000)]);
    res.json({ success: true });
  } catch (err) { console.error('[change-password]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/send-reply', auth, adminLimiter, async (req, res) => {
  try {
    const to      = sanitize(req.body.to,      254);
    const subject = sanitize(req.body.subject, 200);
    const message = String(req.body.message || '').slice(0, 5000);
    const msgId   = parseInt(req.body.messageId, 10);
    if (!validator.isEmail(to)) return res.status(400).json({ error: 'Email destinataire invalide.' });
    if (!subject)               return res.status(400).json({ error: 'Sujet requis.' });
    if (message.length < 5)     return res.status(400).json({ error: 'Message trop court.' });
    if (!process.env.BREVO_API_KEY)
      return res.status(500).json({ error: 'Configuration email manquante.' });
    const safeMessage = validator.escape(message).replace(/\n/g, '<br>');
    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': process.env.BREVO_API_KEY,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: { name: 'Philippe Hountondji', email: 'hountondjiphilippe58@gmail.com' },
        to: [{ email: to }],
        subject: subject,
        htmlContent: '<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>' + safeMessage + '</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji</p></div>'
      })
    });
    if (!emailResponse.ok) {
      const errData = await emailResponse.json();
      throw new Error(errData.message || 'Erreur Brevo');
    }
    if (msgId > 0) await pool.query('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = $1', [msgId]);
    res.json({ success: true });
  } catch (err) { console.error('[send-reply]', err.message); res.status(500).json({ error: 'Erreur envoi email : ' + err.message }); }
});

// ── ROUTES PUBLIQUES : PROJETS / EXPÉRIENCES / COMPÉTENCES ───────────────

app.get('/api/projets', async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM projets ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, projets: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.get('/api/experiences', async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM experiences ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, experiences: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.get('/api/competences', async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM competences ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, competences: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── ROUTES ADMIN : PROJETS ────────────────────────────────────────────────

app.get('/api/admin/projets', auth, adminLimiter, async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM projets ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, projets: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/projets', auth, adminLimiter, async (req, res) => {
  try {
    const titre        = sanitize(req.body.titre,        200);
    const description  = sanitize(req.body.description,  1000);
    const technologies = sanitize(req.body.technologies || '', 500);
    const lien_site    = sanitize(req.body.lien_site    || '', 500);
    const lien_github  = sanitize(req.body.lien_github  || '', 500);
    const image_url    = sanitize(req.body.image_url    || '', 500);
    const etiquette    = sanitize(req.body.etiquette    || 'Projet', 100);
    const statut       = sanitize(req.body.statut       || 'termine', 50);
    const ordre        = parseInt(req.body.ordre || 0, 10);

    if (titre.length < 2)       return res.status(400).json({ error: 'Titre trop court.' });
    if (description.length < 5) return res.status(400).json({ error: 'Description trop courte.' });

    const r = await pool.query(
      `INSERT INTO projets (titre, description, technologies, lien_site, lien_github, image_url, etiquette, statut, ordre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [titre, description, technologies, lien_site, lien_github, image_url, etiquette, statut, ordre]
    );
    res.status(201).json({ success: true, projet: r.rows[0] });
  } catch (err) { console.error('[projet-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── MODIFIER un projet ────────────────────────────────────────────────────
app.patch('/api/admin/projets/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const titre        = sanitize(req.body.titre,        200);
    const description  = sanitize(req.body.description,  1000);
    const technologies = sanitize(req.body.technologies || '', 500);
    const lien_site    = sanitize(req.body.lien_site    || '', 500);
    const lien_github  = sanitize(req.body.lien_github  || '', 500);
    const image_url    = req.body.image_url ? String(req.body.image_url).slice(0, 500000) : '';
    const etiquette    = sanitize(req.body.etiquette    || 'Projet', 100);
    const statut       = sanitize(req.body.statut       || 'termine', 50);
    const ordre        = parseInt(req.body.ordre || 0, 10);

    if (titre.length < 2)       return res.status(400).json({ error: 'Titre trop court.' });
    if (description.length < 5) return res.status(400).json({ error: 'Description trop courte.' });

    const r = await pool.query(
      `UPDATE projets SET titre=$1, description=$2, technologies=$3, lien_site=$4, lien_github=$5,
       image_url=$6, etiquette=$7, statut=$8, ordre=$9, updated_at=NOW()
       WHERE id=$10 RETURNING *`,
      [titre, description, technologies, lien_site, lien_github, image_url, etiquette, statut, ordre, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json({ success: true, projet: r.rows[0] });
  } catch (err) { console.error('[projet-patch]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/projets/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const r = await pool.query('DELETE FROM projets WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Projet introuvable.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── ROUTES ADMIN : EXPÉRIENCES ────────────────────────────────────────────

app.get('/api/admin/experiences', auth, adminLimiter, async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM experiences ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, experiences: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/experiences', auth, adminLimiter, async (req, res) => {
  try {
    const titre       = sanitize(req.body.titre,       200);
    const type_exp    = sanitize(req.body.type_exp    || '', 100);
    const entreprise  = sanitize(req.body.entreprise  || '', 200);
    const lieu        = sanitize(req.body.lieu        || '', 200);
    const date_debut  = sanitize(req.body.date_debut  || '', 100);
    const date_fin    = sanitize(req.body.date_fin    || '', 100);
    const description = sanitize(req.body.description || '', 1000);
    const tags        = sanitize(req.body.tags        || '', 500);
    const statut      = sanitize(req.body.statut      || 'termine', 50);
    const ordre       = parseInt(req.body.ordre || 0, 10);

    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });

    const r = await pool.query(
      `INSERT INTO experiences (titre, type_exp, entreprise, lieu, date_debut, date_fin, description, tags, statut, ordre)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [titre, type_exp, entreprise, lieu, date_debut, date_fin, description, tags, statut, ordre]
    );
    res.status(201).json({ success: true, experience: r.rows[0] });
  } catch (err) { console.error('[experience-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── MODIFIER une expérience ───────────────────────────────────────────────
app.patch('/api/admin/experiences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const titre       = sanitize(req.body.titre,       200);
    const type_exp    = sanitize(req.body.type_exp    || '', 100);
    const entreprise  = sanitize(req.body.entreprise  || '', 200);
    const lieu        = sanitize(req.body.lieu        || '', 200);
    const date_debut  = sanitize(req.body.date_debut  || '', 100);
    const date_fin    = sanitize(req.body.date_fin    || '', 100);
    const description = sanitize(req.body.description || '', 1000);
    const tags        = sanitize(req.body.tags        || '', 500);
    const statut      = sanitize(req.body.statut      || 'termine', 50);
    const ordre       = parseInt(req.body.ordre || 0, 10);

    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });

    const r = await pool.query(
      `UPDATE experiences SET titre=$1, type_exp=$2, entreprise=$3, lieu=$4, date_debut=$5,
       date_fin=$6, description=$7, tags=$8, statut=$9, ordre=$10, updated_at=NOW()
       WHERE id=$11 RETURNING *`,
      [titre, type_exp, entreprise, lieu, date_debut, date_fin, description, tags, statut, ordre, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Expérience introuvable.' });
    res.json({ success: true, experience: r.rows[0] });
  } catch (err) { console.error('[experience-patch]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/experiences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const r = await pool.query('DELETE FROM experiences WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Expérience introuvable.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── ROUTES ADMIN : COMPÉTENCES ────────────────────────────────────────────

app.get('/api/admin/competences', auth, adminLimiter, async (req, res) => {
  try {
    const rows = await pool.query('SELECT * FROM competences ORDER BY ordre ASC, created_at DESC');
    res.json({ success: true, competences: rows.rows });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/competences', auth, adminLimiter, async (req, res) => {
  try {
    const categorie    = sanitize(req.body.categorie,    200);
    const icone        = sanitize(req.body.icone        || 'fas fa-code', 100);
    const couleur      = sanitize(req.body.couleur      || 'linear-gradient(135deg,#667eea,#764ba2)', 200);
    const niveau       = Math.min(100, Math.max(0, parseInt(req.body.niveau || 70, 10)));
    const label_niveau = sanitize(req.body.label_niveau || 'Intermédiaire', 100);
    const items        = sanitize(req.body.items        || '', 1000);
    const ordre        = parseInt(req.body.ordre || 0, 10);

    if (categorie.length < 2) return res.status(400).json({ error: 'Catégorie trop courte.' });

    const r = await pool.query(
      `INSERT INTO competences (categorie, icone, couleur, niveau, label_niveau, items, ordre)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [categorie, icone, couleur, niveau, label_niveau, items, ordre]
    );
    res.status(201).json({ success: true, competence: r.rows[0] });
  } catch (err) { console.error('[competence-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── MODIFIER une compétence ───────────────────────────────────────────────
app.patch('/api/admin/competences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const categorie    = sanitize(req.body.categorie,    200);
    const icone        = sanitize(req.body.icone        || 'fas fa-code', 100);
    const couleur      = sanitize(req.body.couleur      || 'linear-gradient(135deg,#667eea,#764ba2)', 200);
    const niveau       = Math.min(100, Math.max(0, parseInt(req.body.niveau || 70, 10)));
    const label_niveau = sanitize(req.body.label_niveau || 'Intermédiaire', 100);
    const items        = sanitize(req.body.items        || '', 1000);
    const ordre        = parseInt(req.body.ordre || 0, 10);

    if (categorie.length < 2) return res.status(400).json({ error: 'Catégorie trop courte.' });

    const r = await pool.query(
      `UPDATE competences SET categorie=$1, icone=$2, couleur=$3, niveau=$4,
       label_niveau=$5, items=$6, ordre=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [categorie, icone, couleur, niveau, label_niveau, items, ordre, id]
    );
    if (r.rowCount === 0) return res.status(404).json({ error: 'Compétence introuvable.' });
    res.json({ success: true, competence: r.rows[0] });
  } catch (err) { console.error('[competence-patch]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/competences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const r = await pool.query('DELETE FROM competences WHERE id = $1', [id]);
    if (r.rowCount === 0) return res.status(404).json({ error: 'Compétence introuvable.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── INIT ADMIN ────────────────────────────────────────────────────────────

app.post('/api/admin/init', async (req, res) => {
  try {
    const hash = await bcrypt.hash('portfolio@jesuusede', 14);
    await pool.query('DELETE FROM admin_users WHERE email = $1', ['hountondjiphilippe58@gmail.com']);
    await pool.query('INSERT INTO admin_users (email, password) VALUES ($1, $2)', ['hountondjiphilippe58@gmail.com', hash]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// ── STATIC & FALLBACK ─────────────────────────────────────────────────────
// ⚠️ CORRECTION : 'frontend' remplacé par 'docs' (nom réel du dossier)

app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.use(express.static(path.join(__dirname, '..', 'docs'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'docs', 'index.html')));

app.use(function (req, res) {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ressource introuvable.' });
  res.status(404).sendFile(path.join(__dirname, '..', 'docs', 'index.html'));
});

app.use(function (err, req, res, next) {
  console.error('[erreur]', err.message);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Erreur interne.' : err.message });
});

connectDB().then(function () {
  const server = app.listen(PORT, function () {
    console.log('[Serveur] Port ' + PORT + ' — ' + (process.env.NODE_ENV || 'development'));
  });
  function shutdown() {
    server.close(function () {
      if (pool) pool.end(function () { process.exit(0); });
      else process.exit(0);
    });
    setTimeout(function () { process.exit(1); }, 10000);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT',  shutdown);
  process.on('uncaughtException',  function (err) { console.error('[uncaughtException]', err.message); });
  process.on('unhandledRejection', function (r)   { console.error('[unhandledRejection]', r); });
}).catch(function (err) { console.error('[Démarrage impossible]', err.message); process.exit(1); });