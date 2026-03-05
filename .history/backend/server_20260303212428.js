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
const nodemailer = require('nodemailer');

const app  = express();
const PORT = process.env.PORT || 3000;

/* ============================================================
   1. VÉRIFICATIONS CRITIQUES AU DÉMARRAGE
   → Le serveur refuse de démarrer si des variables
     essentielles sont absentes ou trop faibles
============================================================ */
const REQUIRED_ENV = ['JWT_SECRET', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
REQUIRED_ENV.forEach(function (key) {
  if (!process.env[key]) {
    console.error('ERREUR FATALE : variable manquante → ' + key);
    process.exit(1);
  }
});

if (process.env.JWT_SECRET.length < 64) {
  console.error('ERREUR FATALE : JWT_SECRET trop court (64 caractères minimum recommandés).');
  process.exit(1);
}

app.set('trust proxy', 1);

/* ============================================================
   2. HELMET — En-têtes HTTP de sécurité
   → Protège contre XSS, clickjacking, sniffing MIME,
     fuites de Referer, et force HTTPS en production
============================================================ */
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   [
        "'self'", "'unsafe-inline'",
        'https://cdnjs.cloudflare.com',
        'https://cdn.jsdelivr.net',
        'https://www.googletagmanager.com'
      ],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://cdnjs.cloudflare.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com', 'https://cdnjs.cloudflare.com'],
      imgSrc:      ["'self'", 'data:', 'https://ui-avatars.com', 'https://img.icons8.com', 'https:'],
      connectSrc:  ["'self'"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
      baseUri:     ["'self'"],
      formAction:  ["'self'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null,
    }
  },
  // HSTS : force HTTPS pendant 2 ans en production
  hsts: process.env.NODE_ENV === 'production'
    ? { maxAge: 63072000, includeSubDomains: true, preload: true }
    : false,
  referrerPolicy:            { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  noSniff:    true,   // X-Content-Type-Options: nosniff
  frameguard: { action: 'deny' },  // X-Frame-Options: DENY
}));

/* ============================================================
   3. PARSEURS — Limite la taille des corps de requête
   → Empêche les attaques par surcharge mémoire (DoS)
============================================================ */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

/* ============================================================
   4. CORS — Origines strictement autorisées
   → Bloque toute requête cross-origin non listée
============================================================ */
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',').map(function (s) { return s.trim(); }).filter(Boolean);

app.use(cors({
  origin: function (origin, cb) {
    if (!origin) return cb(null, true); // same-origin, curl, Postman
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Origine CORS refusée.'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge:         600
}));

/* ============================================================
   5. RATE LIMITING — Anti brute-force & DoS
============================================================ */

// Global : 120 req/min par IP
app.use(rateLimit({
  windowMs: 60 * 1000, max: 120,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' }
}));

// Contact : 5 req / 10 min (anti-spam)
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, max: 5,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 10 minutes.' }
});

// Login : 10 tentatives / 15 min, ne compte pas les succès
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 10,
  skipSuccessfulRequests: true,
  standardHeaders: true, legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' }
});

// Routes admin protégées : 200 req / 15 min
const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, max: 200,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Limite d'utilisation admin atteinte." }
});

/* ============================================================
   6. BASE DE DONNÉES
============================================================ */
let pool;

async function connectDB() {
  const sslConfig = process.env.DB_SSL === 'true'
    ? { rejectUnauthorized: true }
    : false;

  pool = mysql.createPool({
    host:               process.env.DB_HOST || 'localhost',
    port:               parseInt(process.env.DB_PORT || '3306', 10),
    user:               process.env.DB_USER,
    password:           process.env.DB_PASSWORD,
    database:           process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit:    10,
    queueLimit:         0,
    ssl:                sslConfig,
    timezone:           'Z',
    typeCast:           true,
    supportBigNumbers:  false,
  });

  const conn = await pool.getConnection();
  conn.release();
  await createTables();
  console.log('[DB] Connectée.');
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
      is_read    TINYINT(1) DEFAULT 0,
      replied_at TIMESTAMP  NULL DEFAULT NULL,
      created_at TIMESTAMP  DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_created (created_at),
      INDEX idx_is_read (is_read)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Table de tokens révoqués → déconnexion réelle côté serveur
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS revoked_tokens (
      jti        VARCHAR(128) PRIMARY KEY,
      revoked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      expires_at TIMESTAMP NOT NULL,
      INDEX idx_expires (expires_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  // Nettoyage automatique des tokens expirés
  await pool.execute('DELETE FROM revoked_tokens WHERE expires_at < NOW()');

  const [rows] = await pool.execute('SELECT COUNT(*) AS n FROM admin_users');
  if (rows[0].n === 0) {
    console.log('\n[SETUP] Aucun compte admin. Lancez : npm run setup\n');
  }
}

/* ============================================================
   7. HELPERS
============================================================ */

// Échappe le HTML + tronque → empêche XSS et dépassements
function sanitize(val, max) {
  return validator.escape(String(val || '').trim()).slice(0, max);
}

// IP réelle du client (derrière proxy)
function clientIP(req) {
  return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    .split(',')[0].trim().slice(0, 45);
}

// Parse entier positif borné
function parsePositiveInt(val, def, min, max) {
  const n = parseInt(val, 10);
  if (isNaN(n)) return def;
  return Math.min(max, Math.max(min, n));
}

// Génère un identifiant unique (JTI) pour chaque token JWT
function generateJti() {
  return crypto.randomBytes(32).toString('hex');
}

/* ============================================================
   8. MIDDLEWARE AUTH
   → Vérifie la signature JWT + l'audience + l'émetteur
   → Vérifie que le token n'a pas été révoqué (logout réel)
============================================================ */
async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non autorisé.' });
  }

  const token = header.slice(7);
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer:   'portfolio-admin',
      audience: 'portfolio-admin'
    });
  } catch (err) {
    const msg = err.name === 'TokenExpiredError'
      ? 'Session expirée. Reconnectez-vous.'
      : 'Token invalide.';
    return res.status(401).json({ error: msg });
  }

  // Vérification révocation (déconnexion ou changement de mot de passe)
  try {
    const [rows] = await pool.execute(
      'SELECT 1 FROM revoked_tokens WHERE jti = ? LIMIT 1',
      [payload.jti]
    );
    if (rows.length > 0) {
      return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
    }
  } catch (err) {
    console.error('[auth]', err.message);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }

  req.admin = payload;
  next();
}

/* ============================================================
   9. ROUTES PUBLIQUES
============================================================ */

app.get('/api/health', function (req, res) {
  res.json({ status: 'ok', ts: Date.now() });
});

// Formulaire de contact
app.post('/api/contact', contactLimiter, async function (req, res) {
  try {
    const name    = sanitize(req.body.name,    100);
    const email   = sanitize(req.body.email,   254);
    const phone   = sanitize(req.body.phone,    20);
    const message = sanitize(req.body.message, 2000);

    if (name.length < 2 || name.length > 100)
      return res.status(400).json({ error: 'Nom invalide (2–100 caractères).' });
    if (!validator.isEmail(email))
      return res.status(400).json({ error: 'Email invalide.' });
    if (message.length < 10)
      return res.status(400).json({ error: 'Message trop court (10 caractères min).' });
    if (phone && !/^\+?[0-9]{8,20}$/.test(phone))
      return res.status(400).json({ error: 'Numéro de téléphone invalide.' });

    await pool.execute(
      'INSERT INTO messages (name, email, phone, message, ip_address) VALUES (?, ?, ?, ?, ?)',
      [name, email, phone || null, message, clientIP(req)]
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[contact]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Login admin
app.post('/api/admin/login', loginLimiter, async function (req, res) {
  try {
    const email    = sanitize(req.body.email, 254);
    const password = String(req.body.password || '').slice(0, 128);

    if (!email || !password)
      return res.status(400).json({ error: 'Email et mot de passe requis.' });

    // Format email invalide → réponse en temps constant (anti-énumération)
    if (!validator.isEmail(email)) {
      await bcrypt.compare('dummy', '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX');
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const [rows] = await pool.execute(
      'SELECT id, email, password FROM admin_users WHERE email = ? LIMIT 1',
      [email]
    );

    // Hash factice pour timing constant même si le compte n'existe pas
    const DUMMY_HASH = '$2b$14$invalidhashfortimingprotectXXXXXXXXXXXXXXXXXXXXXXXXX';
    const hash       = rows.length ? rows[0].password : DUMMY_HASH;
    const valid      = await bcrypt.compare(password, hash);

    if (!rows.length || !valid)
      return res.status(401).json({ error: 'Identifiants incorrects.' });

    const jti   = generateJti();
    const token = jwt.sign(
      { id: rows[0].id, email: rows[0].email, jti },
      process.env.JWT_SECRET,
      { expiresIn: '8h', issuer: 'portfolio-admin', audience: 'portfolio-admin' }
    );

    res.json({ success: true, token });
  } catch (err) {
    console.error('[login]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

/* ============================================================
   10. ROUTES ADMIN PROTÉGÉES
============================================================ */

// Logout réel : révoque le token en base
app.post('/api/admin/logout', auth, async function (req, res) {
  try {
    const expiresAt = new Date(req.admin.exp * 1000);
    await pool.execute(
      'INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)',
      [req.admin.jti, expiresAt]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[logout]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Liste des messages
app.get('/api/admin/messages', auth, adminLimiter, async function (req, res) {
  try {
    const page   = parsePositiveInt(req.query.page,  1,  1, 9999);
    const limit  = parsePositiveInt(req.query.limit, 20, 1, 100);
    const offset = (page - 1) * limit;
    const filter = req.query.filter;

    let where = '';
    if (filter === 'read')   where = 'WHERE is_read = 1';
    if (filter === 'unread') where = 'WHERE is_read = 0';

    const [[{ total }]] = await pool.execute(
      `SELECT COUNT(*) AS total FROM messages ${where}`
    );
    const [rows] = await pool.execute(
      `SELECT id, name, email, phone, message, is_read, replied_at, created_at
       FROM messages ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [limit, offset]
    );

    res.json({ success: true, messages: rows, total, page, limit });
  } catch (err) {
    console.error('[messages]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Statistiques
app.get('/api/admin/stats', auth, adminLimiter, async function (req, res) {
  try {
    const [[{ total }]]   = await pool.execute('SELECT COUNT(*) AS total FROM messages');
    const [[{ read }]]    = await pool.execute('SELECT COUNT(*) AS read FROM messages WHERE is_read = 1');
    const [[{ unread }]]  = await pool.execute('SELECT COUNT(*) AS unread FROM messages WHERE is_read = 0');
    const [[{ today }]]   = await pool.execute("SELECT COUNT(*) AS today FROM messages WHERE DATE(created_at) = CURDATE()");
    const [[{ replied }]] = await pool.execute('SELECT COUNT(*) AS replied FROM messages WHERE replied_at IS NOT NULL');
    const [daily]         = await pool.execute(
      `SELECT DATE(created_at) AS date, COUNT(*) AS count
       FROM messages WHERE created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
       GROUP BY DATE(created_at) ORDER BY date ASC`
    );
    res.json({ success: true, stats: { total, read, unread, today, replied, daily } });
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Marquer tous lus
app.patch('/api/admin/messages/read-all', auth, adminLimiter, async function (req, res) {
  try {
    await pool.execute('UPDATE messages SET is_read = 1 WHERE is_read = 0');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Toggle lu/non lu
app.patch('/api/admin/messages/:id/read', auth, adminLimiter, async function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const [rows] = await pool.execute(
      'SELECT is_read FROM messages WHERE id = ? LIMIT 1', [id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Message introuvable.' });

    const newVal = rows[0].is_read ? 0 : 1;
    await pool.execute('UPDATE messages SET is_read = ? WHERE id = ?', [newVal, id]);
    res.json({ success: true, is_read: !!newVal });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Marquer comme répondu
app.patch('/api/admin/messages/:id/replied', auth, adminLimiter, async function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    await pool.execute(
      'UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Supprimer un message
app.delete('/api/admin/messages/:id', auth, adminLimiter, async function (req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });

    const [result] = await pool.execute('DELETE FROM messages WHERE id = ?', [id]);
    if (result.affectedRows === 0)
      return res.status(404).json({ error: 'Message introuvable.' });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Suppression en masse
app.delete('/api/admin/messages', auth, adminLimiter, async function (req, res) {
  try {
    const type = req.query.type;
    if (type === 'read')      await pool.execute('DELETE FROM messages WHERE is_read = 1');
    else if (type === 'all')  await pool.execute('DELETE FROM messages');
    else return res.status(400).json({ error: 'Utilisez ?type=read ou ?type=all' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Changement de mot de passe avec règles de complexité
app.post('/api/admin/change-password', auth, adminLimiter, async function (req, res) {
  try {
    const current = String(req.body.current || '').slice(0, 128);
    const next    = String(req.body.next    || '').slice(0, 128);

    if (!current || !next)
      return res.status(400).json({ error: 'Les deux mots de passe sont requis.' });
    if (next.length < 12)
      return res.status(400).json({ error: 'Mot de passe trop court (12 caractères min).' });
    // Complexité obligatoire
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^a-zA-Z\d])/.test(next))
      return res.status(400).json({ error: 'Le mot de passe doit contenir majuscule, minuscule, chiffre et caractère spécial.' });
    if (current === next)
      return res.status(400).json({ error: 'Le nouveau mot de passe doit être différent.' });

    const [rows] = await pool.execute(
      'SELECT password FROM admin_users WHERE id = ? LIMIT 1', [req.admin.id]
    );
    if (!rows.length) return res.status(404).json({ error: 'Compte introuvable.' });

    const valid = await bcrypt.compare(current, rows[0].password);
    if (!valid) return res.status(401).json({ error: 'Mot de passe actuel incorrect.' });

    // Coût bcrypt élevé (14) pour résister au brute-force
    const hash = await bcrypt.hash(next, 14);
    await pool.execute(
      'UPDATE admin_users SET password = ? WHERE id = ?', [hash, req.admin.id]
    );

    // Révoque le token actuel → force reconnexion
    const expiresAt = new Date(req.admin.exp * 1000);
    await pool.execute(
      'INSERT IGNORE INTO revoked_tokens (jti, expires_at) VALUES (?, ?)',
      [req.admin.jti, expiresAt]
    );

    res.json({ success: true, message: 'Mot de passe changé. Reconnectez-vous.' });
  } catch (err) {
    console.error('[change-password]', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

// Envoi email de réponse
app.post('/api/admin/send-reply', auth, adminLimiter, async function (req, res) {
  try {
    const to      = sanitize(req.body.to,      254);
    const subject = sanitize(req.body.subject, 200);
    const message = String(req.body.message || '').slice(0, 5000);
    const msgId   = parseInt(req.body.messageId, 10);

    if (!validator.isEmail(to))
      return res.status(400).json({ error: 'Email destinataire invalide.' });
    if (!subject)
      return res.status(400).json({ error: 'Sujet requis.' });
    if (message.length < 5)
      return res.status(400).json({ error: 'Message trop court.' });
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD)
      return res.status(500).json({ error: 'Configuration email manquante.' });

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
    });

    // Échappe le message avant injection dans le HTML
    const safeMessage = validator.escape(message).replace(/\n/g, '<br>');

    await transporter.sendMail({
      from:    `"Philippe Hountondji" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      text:    message,
      html:    `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px">
                  <p>${safeMessage}</p>
                  <hr style="border:1px solid #eee;margin:20px 0">
                  <p style="color:#888;font-size:12px">Philippe Hountondji — hountondjiphilippe58@gmail.com</p>
                </div>`
    });

    if (msgId > 0) {
      await pool.execute(
        'UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = ?', [msgId]
      );
    }

    res.json({ success: true, message: 'Email envoyé avec succès.' });
  } catch (err) {
    console.error('[send-reply]', err.message);
    res.status(500).json({ error: 'Erreur envoi email : ' + err.message });
  }
});

/* ============================================================
   11. FICHIERS STATIQUES
   Structure du projet :
     backend/server.js
     frontend/   → index.html, css/, js/, images/, cv/
     admin/      → interface admin
============================================================ */

// CV en lecture seule — inline dans le navigateur
app.use('/cv', express.static(path.join(__dirname, '..', 'frontend', 'cv'), {
  etag: true, lastModified: true, dotfiles: 'deny',
  setHeaders: function (res, filePath) {
    if (filePath.endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'inline');
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cache-Control', 'public, max-age=3600');
    }
  }
}));

// Interface admin
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), {
  etag: true, lastModified: true, dotfiles: 'deny'
}));

// Portfolio (frontend)
app.use(express.static(path.join(__dirname, '..', 'frontend'), {
  etag: true, lastModified: true, dotfiles: 'deny'
}));

// Page d'accueil explicite
app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

/* ============================================================
   12. GESTION DES ERREURS
============================================================ */

// 404 — ne révèle rien sur la structure interne
app.use(function (req, res) {
  if (req.path.startsWith('/api/'))
    return res.status(404).json({ error: 'Ressource introuvable.' });
  res.status(404).sendFile(path.join(__dirname, '..', 'frontend', 'index.html'));
});

// Erreurs non gérées — n'expose les détails qu'en développement
app.use(function (err, req, res, next) {
  console.error('[erreur]', err.message);
  const msg = process.env.NODE_ENV === 'production'
    ? 'Erreur interne du serveur.'
    : err.message;
  res.status(500).json({ error: msg });
});

/* ============================================================
   13. DÉMARRAGE + ARRÊT PROPRE
============================================================ */
connectDB()
  .then(function () {
    const server = app.listen(PORT, function () {
      console.log('[Serveur] Port ' + PORT + ' — ' + (process.env.NODE_ENV || 'development'));
    });

    // Arrêt propre : ferme les connexions DB avant de quitter
    function shutdown(signal) {
      console.log('\n[Serveur] ' + signal + ' reçu — arrêt...');
      server.close(function () {
        if (pool) pool.end(function () { process.exit(0); });
        else process.exit(0);
      });
      // Force quit après 10s si blocage
      setTimeout(function () { process.exit(1); }, 10000);
    }

    process.on('SIGTERM', function () { shutdown('SIGTERM'); });
    process.on('SIGINT',  function () { shutdown('SIGINT'); });

    // Log des erreurs non capturées sans crash en prod
    process.on('uncaughtException', function (err) {
      console.error('[uncaughtException]', err.message);
      if (process.env.NODE_ENV !== 'production') process.exit(1);
    });
    process.on('unhandledRejection', function (reason) {
      console.error('[unhandledRejection]', reason);
    });
  })
  .catch(function (err) {
    console.error('[Démarrage impossible]', err.message);
    process.exit(1);
  });