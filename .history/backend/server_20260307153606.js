require('dotenv').config();

const express    = require('express');
const mysql      = require('mysql2/promise');
const bcrypt     = require('bcrypt');
const jwt        = require('jsonwebtoken');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const helmet     = require('helmet');
const validator  = require('validator');
const path       = require('path');
const crypto     = require('crypto');
const { Resend } = require('resend');

const app  = express();
const PORT = process.env.PORT || 3000;

['JWT_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].forEach(function (key) {
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
      scriptSrc:  [
        "'self'",
        "'unsafe-inline'",
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://www.googletagmanager.com',
        'https://www.google-analytics.com',
      ],
      styleSrc:   [
        "'self'",
        "'unsafe-inline'",
        'https://fonts.googleapis.com',
        'https://cdnjs.cloudflare.com',
      ],
      fontSrc:    [
        "'self'",
        'https://fonts.gstatic.com',
        'https://cdnjs.cloudflare.com',
      ],
      imgSrc:     [
        "'self'",
        'data:',
        'https://ui-avatars.com',
        'https://img.icons8.com',
        'https:',
      ],
      connectSrc: [
        "'self'",
        'https://cdn.jsdelivr.net',
        'https://www.google-analytics.com',
        'https://analytics.google.com',
        'https://www.googletagmanager.com',
        'https://region1.google-analytics.com',
      ],
      frameSrc:   ["'none'"],
      objectSrc:  ["'none'"],
      baseUri:    ["'self'"],
      formAction: ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 63072000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  // ✅ CORRECTION : 'same-origin' bloquait les ressources sur Android Chrome mobile
  // 'cross-origin' permet aux ressources d'être chargées normalement
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  noSniff: true,
  frameguard: { action: 'deny' },
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
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
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: true } : false,
    timezone: 'Z',
  });
  const conn = await pool.getConnection();
  conn.release();
  await createTables();
  console.log('[DB] Connectée.');
}

async function createTables() {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS admin_users (
      id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL,
      email VARCHAR(254) NOT NULL, phone VARCHAR(20), message TEXT NOT NULL,
      ip_address VARCHAR(45), is_read TINYINT(1) DEFAULT 0,
      replied_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at), INDEX idx_is_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti VARCHAR(128) PRIMARY KEY, revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL, INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await pool.execute('DELETE FROM revoked_tokens WHERE expires_at < NOW()');
  const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM admin_users');
  if (rows[0].n === 0) console.log('\n[SETUP] Aucun compte admin. Lancez : npm run setup\n');
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
    const [rows] = await pool.execute('SELECT 1 FROM revoked_tokens WHERE jti = ? LIMIT 1', [payload.jti]);
    if (rows.length > 0) return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
  req.admin = payload;
  next();
}

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

app.post('/api/contact', contactLimiter, async (req, res) => {
  try {
    const name    = sanitize(req.body.name,    100);
    const email   = sanitize(req.body.email,   254);
    const phone   = sanitize(req.body.phone,    20);
    const message = sanitize(req.body.message, 2000);
    if (name.length < 2)           return res.status(400).json({ error: 'Nom invalide (2–100 caractères).' });
    if (!validator.isEmail(email)) return res.status(400).json({ error: 'Email invalide.' });
    if (message.length < 10)       return res.status(400).json({ error: 'Message trop court (10 caractères min).' });
    if (phone && !/^\+?[0-9]{8,20}$/.test(phone)) return res.status(400).json({ error: 'Numéro invalide.' });
    await pool.execute('INSERT INTO messages (name, email, phone, message, ip_address) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, message, clientIP(req)]);
    res.json({ success: true });
  } catch (err) { console.error('[contact]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/login', loginLimiter, async (req, res) => {
  try {
    const email    = sanitize(req.body.email, 254);
    const password = String(req.body.password || '').slice(0, 128);
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis.' });
    if (!validator.isEmail(email)) {
      await bcrypt.compare('dummy', '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }
    const [rows] = await pool.execute('SELECT id, email, password FROM admin_users WHERE email = ? LIMIT 1', [email]);
    const hash  = rows.length ? rows[0].password : '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX';
    const valid = await bcrypt.compare(password, hash);
    if (!rows.length || !valid) return res.status(401).json({ error: 'Identifiants incorrects.' });
    const jti   = generateJti();
    const token = jwt.sign({ id: rows[0].id, email: rows[0].email, jti }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ success: true, token });
  } catch (err) { console.error('[login]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.post('/api/admin/logout', auth, async (req, res) => {
  try {
    await pool.execute('INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)',
      [req.admin.jti, new Date(req.admin.exp * 1000)]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.get('/api/admin/messages', auth, adminLimiter, async (req, res) => {
  try {
    const page   = parsePositiveInt(req.query.page,  1,  1, 9999);
    const limit  = parsePositiveInt(req.query.limit, 20, 1, 200);
    const offset = (page - 1) * limit;
    const filter = req.query.filter;
    let where = '';
    if (filter === 'read')   where = 'WHERE is_read = 1';
    if (filter === 'unread') where = 'WHERE is_read = 0';
    const [[{ total }]] = await pool.execute(`SELECT COUNT(*) AS total FROM messages ${where}`);
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, message, is_read, replied_at, created_at FROM messages ${where} ORDER BY created_at DESC LIMIT ${parseInt(limit)} OFFSET ${parseInt(offset)}`);
    res.json({ success: true, messages: rows, total, page, limit });
  } catch (err) { console.error('[messages]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.get('/api/admin/stats', auth, adminLimiter, async (req, res) => {
  try {
    const [[{ total }]]   = await pool.execute('SELECT COUNT(*) AS total FROM messages');
    const [[{ read }]]    = await pool.execute('SELECT COUNT(*) AS `read` FROM messages WHERE is_read = 1');
    const [[{ unread }]]  = await pool.execute('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0');
    const [[{ today }]]   = await pool.execute('SELECT COUNT(*) AS today FROM messages WHERE DATE(created_at) = DATE(NOW())');
    const [[{ replied }]] = await pool.execute('SELECT COUNT(*) AS replied FROM messages WHERE replied_at IS NOT NULL');
    const [daily]         = await pool.execute(
      'SELECT DATE(created_at) AS date, COUNT(*) AS count FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) GROUP BY DATE(created_at) ORDER BY date ASC');
    res.json({ success: true, stats: { total, read, unread, today, replied, daily } });
  } catch (err) { console.error('[stats]', err.message); res.status(500).json({ error: 'Erreur serveur stats: ' + err.message }); }
});

app.patch('/api/admin/messages/read-all', auth, adminLimiter, async (req, res) => {
  try { await pool.execute('UPDATE messages SET is_read = 1 WHERE is_read = 0'); res.json({ success: true }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.patch('/api/admin/messages/:id/read', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const [rows] = await pool.execute('SELECT is_read FROM messages WHERE id = ? LIMIT 1', [id]);
    if (!rows.length) return res.status(404).json({ error: 'Message introuvable.' });
    const newVal = rows[0].is_read ? 0 : 1;
    await pool.execute('UPDATE messages SET is_read = ? WHERE id = ?', [newVal, id]);
    res.json({ success: true, is_read: !!newVal });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.patch('/api/admin/messages/:id/replied', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    await pool.execute('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [id]);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/messages/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const [result] = await pool.execute('DELETE FROM messages WHERE id = ?', [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: 'Message introuvable.' });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

app.delete('/api/admin/messages', auth, adminLimiter, async (req, res) => {
  try {
    const type = req.query.type;
    if (type === 'read')     await pool.execute('DELETE FROM messages WHERE is_read = 1');
    else if (type === 'all') await pool.execute('DELETE FROM messages');
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
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(next))
      return res.status(400).json({ error: 'Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial.' });
    if (current === next) return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent.' });
    const [rows] = await pool.execute('SELECT password FROM admin_users WHERE id = ? LIMIT 1', [req.admin.id]);
    if (!rows.length) return res.status(404).json({ error: 'Compte introuvable.' });
    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });
    const hash = await bcrypt.hash(next, 14);
    await pool.execute('UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.admin.id]);
    await pool.execute('INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)',
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
    if (!validator.isEmail(to))  return res.status(400).json({ error: 'Email destinataire invalide.' });
    if (!subject)                return res.status(400).json({ error: 'Sujet requis.' });
    if (message.length < 5)      return res.status(400).json({ error: 'Message trop court.' });
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      return res.status(500).json({ error: 'Configuration email manquante.' });
    const resend = new Resend(process.env.RESEND_API_KEY);
    const safeMessage = validator.escape(message).replace(/\n/g, '<br>');
    await resend.emails.send({
      from: 'Portfolio <onboarding@resend.dev>',
      to,
      subject,
      text: message,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px"><p>${safeMessage}</p><hr><p style="color:#888;font-size:12px">Philippe Hountondji — hountondjiphilippe58@gmail.com</p></div>`
    });
    if (msgId > 0) await pool.execute('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [msgId]);
    res.json({ success: true });
  } catch (err) { console.error('[send-reply]', err.message); res.status(500).json({ error: 'Erreur envoi email : ' + err.message }); }
});

app.get('/cv/:filename', function (req, res) {
  var filename = path.basename(req.params.filename);
  if (!filename || filename !== req.params.filename) return res.status(400).json({ error: 'Nom invalide.' });
  var filePath = path.join(__dirname, '..', 'frontend', 'cv', filename);
  if (path.extname(filename).toLowerCase() === '.pdf') {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="' + filename + '"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
  }
  res.sendFile(filePath, function (err) {
    if (err) res.status(404).json({ error: 'CV introuvable.' });
  });
});

app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.use(express.static(path.join(__dirname, '..', 'frontend'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html')));

app.post('/api/admin/init', async (req, res) => {
  try {
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('portfolio@jesuusede', 14);
    await pool.execute('DELETE FROM admin_users WHERE email = ?', ['hountondjiphilippe58@gmail.com']);
    await pool.execute('INSERT INTO admin_users (email, password) VALUES (?, ?)', ['hountondjiphilippe58@gmail.com', hash]);
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.use(function (req, res) {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ressource introuvable.' });
  res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});
app.use(function (err, req, res, next) {
  console.error('[erreur]', err.message);
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Erreur interne.' : err.message });
});

connectDB().then(function () {
  const server = app.listen(PORT, function () {
    console.log('[Serveur] Port ' + PORT + ' — ' + (process.env.NODE_ENV || 'development'));
  });
  function shutdown(sig) {
    server.close(function () {
      if (pool) pool.end(function () { process.exit(0); });
      else process.exit(0);
    });
    setTimeout(function () { process.exit(1); }, 10000);
  }
  process.on('SIGTERM', function () { shutdown('SIGTERM'); });
  process.on('SIGINT',  function () { shutdown('SIGINT'); });
  process.on('uncaughtException',  function (err) { console.error('[uncaughtException]', err.message); if (process.env.NODE_ENV !== 'production') process.exit(1); });
  process.on('unhandledRejection', function (r) { console.error('[unhandledRejection]', r); });
}).catch(function (err) { console.error('[Démarrage impossible]', err.message); process.exit(1); });
