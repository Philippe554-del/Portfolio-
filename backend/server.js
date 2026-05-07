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

['JWT_SECRET', 'DATABASE_URL', 'ADMIN_PASSWORD'].forEach(function (key) {
  if (!process.env[key]) { console.error('ERREUR FATALE : variable manquante → ' + key); process.exit(1); }
});
if (process.env.JWT_SECRET.length < 32) {
  console.error('ERREUR FATALE : JWT_SECRET trop court (32 caractères minimum).'); process.exit(1);
}
if (process.env.ADMIN_PASSWORD.length < 12) {
  console.error('ERREUR FATALE : ADMIN_PASSWORD trop court (12 caractères minimum).'); process.exit(1);
}

app.set('trust proxy', 1);

// Hide Express version in headers
app.disable('x-powered-by');

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

// Strict rate limiting for public tracker endpoints
const trackerLimiter = rateLimit({ windowMs: 60000, max: isDev ? 1000 : 60, standardHeaders: true, legacyHeaders: false, message: { error: 'Trop de requêtes.' } });

// CSRF token storage with expiration
const csrfTokens = new Map();
function genererCsrfToken() {
  const token = crypto.randomBytes(32).toString('hex');
  csrfTokens.set(token, Date.now() + 3600000); // Expires in 1 hour
  return token;
}
function validerCsrfToken(token) {
  if (!token || typeof token !== 'string') return false;
  const expiration = csrfTokens.get(token);
  if (!expiration || Date.now() > expiration) {
    csrfTokens.delete(token);
    return false;
  }
  csrfTokens.delete(token); // Token one-time use
  return true;
}
// Nettoyer les tokens expirés toutes les heures
setInterval(() => {
  const now = Date.now();
  for (const [token, expiration] of csrfTokens.entries()) {
    if (now > expiration) csrfTokens.delete(token);
  }
}, 3600000);

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
  await pool.query(`CREATE TABLE IF NOT EXISTS admin_users (id SERIAL PRIMARY KEY, email VARCHAR(254) NOT NULL UNIQUE, password VARCHAR(255) NOT NULL, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS messages (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL, email VARCHAR(254) NOT NULL, phone VARCHAR(20), message TEXT NOT NULL, ip_address VARCHAR(45), is_read SMALLINT DEFAULT 0, replied_at TIMESTAMP NULL DEFAULT NULL, created_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS revoked_tokens (jti VARCHAR(128) PRIMARY KEY, revoked_at TIMESTAMP DEFAULT NOW(), expires_at TIMESTAMP NOT NULL)`);
  await pool.query(`CREATE TABLE IF NOT EXISTS projets (id SERIAL PRIMARY KEY, titre VARCHAR(200) NOT NULL, description TEXT NOT NULL, technologies VARCHAR(500), lien_site VARCHAR(500), lien_github VARCHAR(500), image_url VARCHAR(500), etiquette VARCHAR(100) DEFAULT 'Projet', statut VARCHAR(50) DEFAULT 'termine', ordre INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS experiences (id SERIAL PRIMARY KEY, titre VARCHAR(200) NOT NULL, type_exp VARCHAR(100), entreprise VARCHAR(200), lieu VARCHAR(200), date_debut VARCHAR(100), date_fin VARCHAR(100), description TEXT, tags VARCHAR(500), statut VARCHAR(50) DEFAULT 'termine', ordre INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);
  await pool.query(`CREATE TABLE IF NOT EXISTS competences (id SERIAL PRIMARY KEY, categorie VARCHAR(200) NOT NULL, icone VARCHAR(100) DEFAULT 'fas fa-code', couleur VARCHAR(200) DEFAULT 'linear-gradient(135deg,#667eea,#764ba2)', niveau INTEGER DEFAULT 70, label_niveau VARCHAR(100) DEFAULT 'Intermédiaire', items TEXT, ordre INTEGER DEFAULT 0, created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW())`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS visites (
      id          SERIAL PRIMARY KEY,
      session_id  VARCHAR(64)  NOT NULL,
      page        VARCHAR(255) NOT NULL,
      referrer    TEXT,
      user_agent  TEXT,
      ip_hash     VARCHAR(64),
      pays        VARCHAR(100),
      ville       VARCHAR(100),
      duree_sec   INTEGER      DEFAULT 0,
      entree_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      sortie_at   TIMESTAMPTZ
    )
  `);
  await pool.query(`ALTER TABLE visites ADD COLUMN IF NOT EXISTS pays VARCHAR(100)`);
  await pool.query(`ALTER TABLE visites ADD COLUMN IF NOT EXISTS ville VARCHAR(100)`);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS actions (
      id          SERIAL PRIMARY KEY,
      session_id  VARCHAR(64)  NOT NULL,
      type_action VARCHAR(64)  NOT NULL,
      cible       VARCHAR(255),
      page        VARCHAR(255),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions_visiteurs (
      session_id   VARCHAR(64) PRIMARY KEY,
      premiere_vue TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      derniere_vue TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      nb_pages     INTEGER     DEFAULT 1,
      nb_actions   INTEGER     DEFAULT 0,
      user_agent   TEXT,
      ip_hash      VARCHAR(64),
      pays         VARCHAR(100),
      ville        VARCHAR(100)
    )
  `);
  await pool.query(`ALTER TABLE sessions_visiteurs ADD COLUMN IF NOT EXISTS pays VARCHAR(100)`);
  await pool.query(`ALTER TABLE sessions_visiteurs ADD COLUMN IF NOT EXISTS ville VARCHAR(100)`);

  await pool.query(`CREATE INDEX IF NOT EXISTS idx_visites_entree   ON visites(entree_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_visites_session  ON visites(session_id)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_actions_created  ON actions(created_at)`);
  await pool.query(`CREATE INDEX IF NOT EXISTS idx_sessions_vue     ON sessions_visiteurs(derniere_vue)`);

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

// ── UTILITAIRES ───────────────────────────────────────────────────────────
function sanitize(val, max) { return validator.escape(String(val || '').trim()).slice(0, max); }
function clientIP(req) { return (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim().slice(0, 45); }
function parsePositiveInt(val, def, min, max) { const n = parseInt(val, 10); if (isNaN(n)) return def; return Math.min(max, Math.max(min, n)); }
function generateJti() { return crypto.randomBytes(32).toString('hex'); }

function hasherIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'sel_secret_analytics')).digest('hex').slice(0, 32);
}

function genererSessionId(req) {
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const jour = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(ip + ua + jour).digest('hex').slice(0, 32);
}

// ── SÉCURITÉ : validation URL stricte ────────────────────────────────────
function isURLSafe(val) {
  if (!val) return true;
  const s = String(val).trim().toLowerCase();
  // Bloque javascript:, data:, vbscript: et autres protocoles dangereux
  if (/^(javascript|data|vbscript|file|blob):/i.test(s)) return false;
  return true;
}

// ── GÉOLOCALISATION — ipapi.co (plus fiable que ip-api.com sur Render) ───
async function geoLocaliser(ip) {
  try {
    if (!ip || ip === '::1' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      return { pays: 'Local', ville: 'Local' };
    }
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000),
      headers: { 'User-Agent': 'portfolio-tracker/1.0' }
    });
    const data = await response.json();
    if (data && !data.error) {
      return { pays: data.country_name || null, ville: data.city || null };
    }
    return { pays: null, ville: null };
  } catch (err) {
    return { pays: null, ville: null };
  }
}

// ── MIDDLEWARE AUTH ───────────────────────────────────────────────────────
async function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) return res.status(401).json({ error: 'Non autorisé.' });
  const token = header.slice(7);
  // SÉCURITÉ : longueur max token pour éviter les attaques par payload énorme
  if (token.length > 1024) return res.status(401).json({ error: 'Token invalide.' });
  let payload;
  try { payload = jwt.verify(token, process.env.JWT_SECRET); }
  catch (err) { return res.status(401).json({ error: err.name === 'TokenExpiredError' ? 'Session expirée.' : 'Token invalide.' }); }
  try {
    const r = await pool.query('SELECT 1 FROM revoked_tokens WHERE jti = $1 LIMIT 1', [payload.jti]);
    if (r.rows.length > 0) return res.status(401).json({ error: 'Session révoquée. Reconnectez-vous.' });
  } catch (err) { return res.status(500).json({ error: 'Erreur serveur.' }); }
  req.admin = payload;
  next();
}

// CSRF validation middleware
function verifierCsrf(req, res, next) {
  const token = req.headers['x-csrf-token'];
  if (!token || !validerCsrfToken(token)) {
    return res.status(403).json({ error: 'Token CSRF invalide ou expiré.' });
  }
  next();
}

function genererEmailHTML(opts) {
  const nom     = opts.nomDestinataire  || 'visiteur(se)';
  const reponse = opts.reponse          || '';
  const msgOrig = opts.messageOriginal  || '';
  const date    = opts.dateMessage      || new Date().toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' });
  const annee   = new Date().getFullYear();

  function escEmail(s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  const reponseFmt = escEmail(reponse).replace(/\n/g, '<br>');
  const msgOrigFmt = escEmail(msgOrig).replace(/\n/g, '<br>');

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Réponse de Philippe Hountondji</title>
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f2f5;padding:40px 16px;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;width:100%;">
  <tr>
    <td style="background:#0f172a;border-radius:16px 16px 0 0;padding:36px 40px 28px;text-align:center;">
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 18px;">
        <tr>
          <td style="width:64px;height:64px;background:linear-gradient(135deg,#e85d04,#f48c06);border-radius:50%;text-align:center;vertical-align:middle;">
            <span style="font-size:22px;font-weight:800;color:#ffffff;line-height:64px;letter-spacing:-1px;">PH</span>
          </td>
        </tr>
      </table>
      <h1 style="margin:0 0 6px;color:#f8fafc;font-size:22px;font-weight:700;">Philippe Hountondji</h1>
      <p style="margin:0 0 4px;color:#94a3b8;font-size:12px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;">Développeur Web &amp; Administrateur Réseau</p>
      <p style="margin:0;color:#64748b;font-size:12px;">Porto-Novo, Bénin</p>
    </td>
  </tr>
  <tr>
    <td style="background:#1e293b;padding:12px 40px;text-align:center;">
      <p style="margin:0;color:#e85d04;font-size:11px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">Réponse à votre message</p>
    </td>
  </tr>
  <tr>
    <td style="background:#ffffff;padding:36px 40px;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;">
      <p style="margin:0 0 6px;color:#0f172a;font-size:18px;font-weight:700;">Bonjour ${escEmail(nom)},</p>
      <p style="margin:0 0 28px;color:#64748b;font-size:14px;line-height:1.7;">Merci pour votre message. Voici ma réponse personnelle.</p>
      <p style="margin:0 0 10px;color:#94a3b8;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Votre message du ${escEmail(date)}</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
        <tr>
          <td style="background:#f8fafc;border:1px solid #e2e8f0;border-left:4px solid #94a3b8;border-radius:0 8px 8px 0;padding:18px 20px;">
            <p style="margin:0;color:#475569;font-size:14px;line-height:1.75;font-style:italic;">${msgOrigFmt}</p>
          </td>
        </tr>
      </table>
      <p style="margin:0 0 10px;color:#e85d04;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;">Ma réponse</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
        <tr>
          <td style="background:#fff7ed;border:1px solid #fed7aa;border-left:4px solid #e85d04;border-radius:0 8px 8px 0;padding:18px 20px;">
            <p style="margin:0;color:#1e293b;font-size:15px;line-height:1.8;font-weight:500;">${reponseFmt}</p>
          </td>
        </tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
        <tr><td style="height:1px;background:#e2e8f0;"></td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:32px;">
        <tr>
          <td align="center">
            <a href="https://philippe554-del.github.io/Portfolio-/" target="_blank"
               style="display:inline-block;background:#0f172a;color:#ffffff;text-decoration:none;padding:13px 32px;border-radius:8px;font-size:14px;font-weight:600;">
              Visiter mon Portfolio →
            </a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="background:#f8fafc;border-radius:0 0 16px 16px;padding:24px 40px;text-align:center;border:1px solid #e2e8f0;border-top:none;">
      <p style="margin:0 0 4px;color:#0f172a;font-size:14px;font-weight:700;">Philippe Hountondji</p>
      <p style="margin:0 0 16px;color:#94a3b8;font-size:12px;">Développeur Web · Administrateur Réseau · Porto-Novo, Bénin</p>
      <p style="margin:0;color:#cbd5e1;font-size:11px;">&copy; ${annee} Philippe Hountondji</p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

// Health check endpoint
app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: Date.now() }));

// Generate CSRF token
app.get('/api/csrf-token', (req, res) => {
  const token = genererCsrfToken();
  res.json({ csrfToken: token });
});

// Tracker endpoints
// POST /api/tracker/visite
app.post('/api/tracker/visite', trackerLimiter, async (req, res) => {
  try {
    const { page = '/', referrer = '' } = req.body;

    // Input validation
    const pageSafe     = String(page).slice(0, 255).replace(/[<>"']/g, '');
    const referrerSafe = String(referrer).slice(0, 500).replace(/[<>"']/g, '');

    const sessionId = genererSessionId(req);
    const ipBrut    = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || '';
    const ipHash    = hasherIP(ipBrut);
    const userAgent = (req.headers['user-agent'] || '').slice(0, 500);

    const geo = await geoLocaliser(ipBrut);

    await pool.query(
      `INSERT INTO visites (session_id, page, referrer, user_agent, ip_hash, pays, ville)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, pageSafe, referrerSafe, userAgent, ipHash, geo.pays, geo.ville]
    );
    await pool.query(
      `INSERT INTO sessions_visiteurs (session_id, user_agent, ip_hash, nb_pages, pays, ville)
       VALUES ($1, $2, $3, 1, $4, $5)
       ON CONFLICT (session_id) DO UPDATE
       SET derniere_vue = NOW(),
           nb_pages = sessions_visiteurs.nb_pages + 1,
           pays = COALESCE(sessions_visiteurs.pays, EXCLUDED.pays),
           ville = COALESCE(sessions_visiteurs.ville, EXCLUDED.ville)`,
      [sessionId, userAgent, ipHash, geo.pays, geo.ville]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/visite]', err.message);
    res.status(500).json({ ok: false });
  }
});

// POST /api/tracker/duree
app.post('/api/tracker/duree', trackerLimiter, async (req, res) => {
  try {
    const { page, duree_sec } = req.body;
    // SÉCURITÉ : durée max 1h pour éviter les valeurs aberrantes
    const duree = Math.min(Math.max(parseInt(duree_sec) || 0, 0), 3600);
    const sessionId = genererSessionId(req);
    await pool.query(
      `UPDATE visites SET duree_sec = $1, sortie_at = NOW()
       WHERE session_id = $2 AND page = $3
         AND sortie_at IS NULL
         AND entree_at > NOW() - INTERVAL '2 hours'`,
      [duree, sessionId, String(page || '/').slice(0, 255)]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/duree]', err.message);
    res.status(500).json({ ok: false });
  }
});

// POST /api/tracker/action
app.post('/api/tracker/action', trackerLimiter, async (req, res) => {
  try {
    const { type_action, cible = '', page = '/' } = req.body;
    if (!type_action) return res.json({ ok: false });

    // Only allow specific action types
    const actionsAutorisees = ['scroll_bas', 'clic_contact', 'clic_projet', 'clic_cv', 'clic_github', 'clic_linkedin', 'clic_whatsapp'];
    const typeValide = actionsAutorisees.includes(String(type_action)) ? String(type_action) : 'autre';

    const sessionId = genererSessionId(req);
    await pool.query(
      `INSERT INTO actions (session_id, type_action, cible, page)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, typeValide, String(cible).slice(0, 255).replace(/[<>"']/g, ''), String(page).slice(0, 255)]
    );
    await pool.query(
      `UPDATE sessions_visiteurs SET nb_actions = nb_actions + 1, derniere_vue = NOW()
       WHERE session_id = $1`,
      [sessionId]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/action]', err.message);
    res.status(500).json({ ok: false });
  }
});

// ══════════════════════════════════════════════════════════════════════════
// ANALYTICS — Routes admin
// ══════════════════════════════════════════════════════════════════════════

// GET /api/analytics/resume
app.get('/api/analytics/resume', auth, adminLimiter, async (req, res) => {
  try {
    const [
      totalVisiteurs, visitesAujourd, visitesHier, visiteurs30j,
      pagesPop, actionsTop, parHeure, parJour, dureesMoy, enDirect, parPays
    ] = await Promise.all([
      pool.query(`SELECT COUNT(*) AS total FROM sessions_visiteurs`),
      pool.query(`SELECT COUNT(DISTINCT session_id) AS total FROM visites WHERE entree_at >= CURRENT_DATE`),
      pool.query(`SELECT COUNT(DISTINCT session_id) AS total FROM visites WHERE entree_at >= CURRENT_DATE - INTERVAL '1 day' AND entree_at < CURRENT_DATE`),
      pool.query(`SELECT COUNT(DISTINCT session_id) AS total FROM visites WHERE entree_at >= NOW() - INTERVAL '30 days'`),
      pool.query(`
        SELECT page, COUNT(*) AS vues, COUNT(DISTINCT session_id) AS visiteurs_uniques,
               ROUND(AVG(duree_sec)) AS duree_moy
        FROM visites WHERE entree_at >= NOW() - INTERVAL '30 days'
        GROUP BY page ORDER BY vues DESC LIMIT 8
      `),
      pool.query(`
        SELECT type_action, cible, COUNT(*) AS nb
        FROM actions WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type_action, cible ORDER BY nb DESC LIMIT 8
      `),
      pool.query(`
        SELECT EXTRACT(HOUR FROM entree_at)::int AS heure,
               COUNT(DISTINCT session_id) AS visiteurs
        FROM visites WHERE entree_at >= CURRENT_DATE
        GROUP BY heure ORDER BY heure
      `),
      pool.query(`
        SELECT DATE(entree_at) AS jour,
               COUNT(DISTINCT session_id) AS visiteurs,
               COUNT(*) AS pages_vues
        FROM visites WHERE entree_at >= NOW() - INTERVAL '14 days'
        GROUP BY jour ORDER BY jour
      `),
      pool.query(`
        SELECT ROUND(AVG(duree_sec)) AS duree_moy_globale
        FROM visites WHERE duree_sec > 0 AND duree_sec < 3600
          AND entree_at >= NOW() - INTERVAL '30 days'
      `),
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS en_direct
        FROM sessions_visiteurs WHERE derniere_vue >= NOW() - INTERVAL '5 minutes'
      `),
      pool.query(`
        SELECT pays, COUNT(*) AS nb
        FROM sessions_visiteurs
        WHERE pays IS NOT NULL
        GROUP BY pays ORDER BY nb DESC LIMIT 10
      `)
    ]);

    res.json({
      total_visiteurs:   parseInt(totalVisiteurs.rows[0].total),
      visiteurs_aujourd: parseInt(visitesAujourd.rows[0].total),
      visiteurs_hier:    parseInt(visitesHier.rows[0].total),
      visiteurs_30j:     parseInt(visiteurs30j.rows[0].total),
      en_direct:         parseInt(enDirect.rows[0].en_direct),
      duree_moy_sec:     parseInt(dureesMoy.rows[0]?.duree_moy_globale || 0),
      pages_populaires:  pagesPop.rows,
      actions_top:       actionsTop.rows,
      par_heure:         parHeure.rows,
      par_jour:          parJour.rows,
      par_pays:          parPays.rows
    });
  } catch (err) {
    console.error('[analytics/resume]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/live
app.get('/api/analytics/live', auth, adminLimiter, async (req, res) => {
  try {
    const [enDirect, actionsRecentes] = await Promise.all([
      pool.query(`SELECT COUNT(DISTINCT session_id) AS en_direct FROM sessions_visiteurs WHERE derniere_vue >= NOW() - INTERVAL '5 minutes'`),
      pool.query(`
        SELECT type_action, cible, page, created_at,
               LEFT(session_id, 8) AS session_court
        FROM actions ORDER BY created_at DESC LIMIT 15
      `)
    ]);
    res.json({
      en_direct:        parseInt(enDirect.rows[0].en_direct),
      actions_recentes: actionsRecentes.rows
    });
  } catch (err) {
    console.error('[analytics/live]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/analytics/sessions
app.get('/api/analytics/sessions', auth, adminLimiter, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await pool.query(`
      SELECT s.session_id, s.premiere_vue, s.derniere_vue,
             s.nb_pages, s.nb_actions, s.user_agent,
             s.pays, s.ville,
             (SELECT page FROM visites WHERE session_id = s.session_id ORDER BY entree_at ASC  LIMIT 1) AS page_entree,
             (SELECT page FROM visites WHERE session_id = s.session_id ORDER BY entree_at DESC LIMIT 1) AS derniere_page
      FROM sessions_visiteurs s
      ORDER BY s.derniere_vue DESC
      LIMIT $1
    `, [limit]);
    res.json(result.rows);
  } catch (err) {
    console.error('[analytics/sessions]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── CONTACT ───────────────────────────────────────────────────────────────
app.post('/api/contact', contactLimiter, verifierCsrf, async (req, res) => {
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

// ── ENVOYER UNE RÉPONSE ───────────────────────────────────────────────────
app.post('/api/admin/send-reply', auth, adminLimiter, async (req, res) => {
  try {
    const to              = sanitize(req.body.to,              254);
    const subject         = sanitize(req.body.subject,         200);
    const message         = String(req.body.message         || '').slice(0, 5000);
    const nomDestinataire = String(req.body.nomDestinataire || 'visiteur(se)').slice(0, 100);
    const messageOriginal = String(req.body.messageOriginal  || '').slice(0, 5000);
    const dateMessage     = String(req.body.dateMessage    || '').slice(0, 50);
    const msgId           = parseInt(req.body.messageId, 10);

    if (!validator.isEmail(to)) return res.status(400).json({ error: 'Email destinataire invalide.' });
    if (!subject)               return res.status(400).json({ error: 'Sujet requis.' });
    if (message.length < 5)     return res.status(400).json({ error: 'Message trop court.' });
    if (!process.env.BREVO_API_KEY)
      return res.status(500).json({ error: 'Configuration email manquante (BREVO_API_KEY).' });

    const htmlContent = genererEmailHTML({ nomDestinataire, reponse: message, messageOriginal, dateMessage });

    const emailResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: { 'accept': 'application/json', 'api-key': process.env.BREVO_API_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({
        sender:  { name: 'Philippe Hountondji', email: 'hountondjiphilippe58@gmail.com' },
        replyTo: { name: 'Philippe Hountondji', email: 'hountondjiphilippe58@gmail.com' },
        to:      [{ email: to, name: nomDestinataire }],
        subject, htmlContent
      })
    });

    if (!emailResponse.ok) {
      const errData = await emailResponse.json();
      throw new Error(errData.message || 'Erreur Brevo');
    }

    if (msgId > 0) {
      await pool.query('UPDATE messages SET replied_at = NOW(), is_read = 1 WHERE id = $1', [msgId]);
    }
    res.json({ success: true });
  } catch (err) {
    console.error('[send-reply]', err.message);
    res.status(500).json({ error: 'Erreur envoi email : ' + err.message });
  }
});

// ── ROUTES PUBLIQUES ──────────────────────────────────────────────────────
app.get('/api/projets',     async (req, res) => {
  try { const r = await pool.query('SELECT * FROM projets ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, projets: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.get('/api/experiences', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM experiences ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, experiences: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.get('/api/competences', async (req, res) => {
  try { const r = await pool.query('SELECT * FROM competences ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, competences: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});

// ── ROUTES ADMIN : PROJETS ────────────────────────────────────────────────
app.get('/api/admin/projets', auth, adminLimiter, async (req, res) => {
  try { const r = await pool.query('SELECT * FROM projets ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, projets: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.post('/api/admin/projets', auth, adminLimiter, async (req, res) => {
  try {
    const titre = sanitize(req.body.titre, 200), description = sanitize(req.body.description, 1000);
    const technologies = sanitize(req.body.technologies || '', 500);
    const lien_site   = sanitize(req.body.lien_site || '', 500);
    const lien_github = sanitize(req.body.lien_github || '', 500);
    const image_url   = sanitize(req.body.image_url || '', 500);
    // SÉCURITÉ : validation des URLs
    if (!isURLSafe(lien_site) || !isURLSafe(lien_github) || !isURLSafe(image_url))
      return res.status(400).json({ error: 'URL invalide détectée.' });
    const etiquette = sanitize(req.body.etiquette || 'Projet', 100), statut = sanitize(req.body.statut || 'termine', 50);
    const ordre = parseInt(req.body.ordre || 0, 10);
    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });
    if (description.length < 5) return res.status(400).json({ error: 'Description trop courte.' });
    const r = await pool.query(`INSERT INTO projets (titre,description,technologies,lien_site,lien_github,image_url,etiquette,statut,ordre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [titre, description, technologies, lien_site, lien_github, image_url, etiquette, statut, ordre]);
    res.status(201).json({ success: true, projet: r.rows[0] });
  } catch (err) { console.error('[projet-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.patch('/api/admin/projets/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const titre = sanitize(req.body.titre, 200), description = sanitize(req.body.description, 1000);
    const technologies = sanitize(req.body.technologies || '', 500);
    const lien_site   = sanitize(req.body.lien_site || '', 500);
    const lien_github = sanitize(req.body.lien_github || '', 500);
    const image_url   = req.body.image_url ? String(req.body.image_url).slice(0, 500000) : '';
    if (!isURLSafe(lien_site) || !isURLSafe(lien_github))
      return res.status(400).json({ error: 'URL invalide détectée.' });
    const etiquette = sanitize(req.body.etiquette || 'Projet', 100), statut = sanitize(req.body.statut || 'termine', 50);
    const ordre = parseInt(req.body.ordre || 0, 10);
    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });
    if (description.length < 5) return res.status(400).json({ error: 'Description trop courte.' });
    const r = await pool.query(`UPDATE projets SET titre=$1,description=$2,technologies=$3,lien_site=$4,lien_github=$5,image_url=$6,etiquette=$7,statut=$8,ordre=$9,updated_at=NOW() WHERE id=$10 RETURNING *`,
      [titre, description, technologies, lien_site, lien_github, image_url, etiquette, statut, ordre, id]);
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

// ROUTES ADMIN : EXPÉRIENCES 
app.get('/api/admin/experiences', auth, adminLimiter, async (req, res) => {
  try { const r = await pool.query('SELECT * FROM experiences ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, experiences: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.post('/api/admin/experiences', auth, adminLimiter, async (req, res) => {
  try {
    const titre = sanitize(req.body.titre, 200), type_exp = sanitize(req.body.type_exp || '', 100);
    const entreprise = sanitize(req.body.entreprise || '', 200), lieu = sanitize(req.body.lieu || '', 200);
    const date_debut = sanitize(req.body.date_debut || '', 100), date_fin = sanitize(req.body.date_fin || '', 100);
    const description = sanitize(req.body.description || '', 1000), tags = sanitize(req.body.tags || '', 500);
    const statut = sanitize(req.body.statut || 'termine', 50), ordre = parseInt(req.body.ordre || 0, 10);
    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });
    const r = await pool.query(`INSERT INTO experiences (titre,type_exp,entreprise,lieu,date_debut,date_fin,description,tags,statut,ordre) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [titre, type_exp, entreprise, lieu, date_debut, date_fin, description, tags, statut, ordre]);
    res.status(201).json({ success: true, experience: r.rows[0] });
  } catch (err) { console.error('[experience-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.patch('/api/admin/experiences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const titre = sanitize(req.body.titre, 200), type_exp = sanitize(req.body.type_exp || '', 100);
    const entreprise = sanitize(req.body.entreprise || '', 200), lieu = sanitize(req.body.lieu || '', 200);
    const date_debut = sanitize(req.body.date_debut || '', 100), date_fin = sanitize(req.body.date_fin || '', 100);
    const description = sanitize(req.body.description || '', 1000), tags = sanitize(req.body.tags || '', 500);
    const statut = sanitize(req.body.statut || 'termine', 50), ordre = parseInt(req.body.ordre || 0, 10);
    if (titre.length < 2) return res.status(400).json({ error: 'Titre trop court.' });
    const r = await pool.query(`UPDATE experiences SET titre=$1,type_exp=$2,entreprise=$3,lieu=$4,date_debut=$5,date_fin=$6,description=$7,tags=$8,statut=$9,ordre=$10,updated_at=NOW() WHERE id=$11 RETURNING *`,
      [titre, type_exp, entreprise, lieu, date_debut, date_fin, description, tags, statut, ordre, id]);
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
  try { const r = await pool.query('SELECT * FROM competences ORDER BY ordre ASC, created_at DESC'); res.json({ success: true, competences: r.rows }); }
  catch (err) { res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.post('/api/admin/competences', auth, adminLimiter, async (req, res) => {
  try {
    const categorie = sanitize(req.body.categorie, 200), icone = sanitize(req.body.icone || 'fas fa-code', 100);
    const couleur = sanitize(req.body.couleur || 'linear-gradient(135deg,#667eea,#764ba2)', 200);
    const niveau = Math.min(100, Math.max(0, parseInt(req.body.niveau || 70, 10)));
    const label_niveau = sanitize(req.body.label_niveau || 'Intermédiaire', 100);
    const items = sanitize(req.body.items || '', 1000), ordre = parseInt(req.body.ordre || 0, 10);
    if (categorie.length < 2) return res.status(400).json({ error: 'Catégorie trop courte.' });
    const r = await pool.query(`INSERT INTO competences (categorie,icone,couleur,niveau,label_niveau,items,ordre) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [categorie, icone, couleur, niveau, label_niveau, items, ordre]);
    res.status(201).json({ success: true, competence: r.rows[0] });
  } catch (err) { console.error('[competence-add]', err.message); res.status(500).json({ error: 'Erreur serveur.' }); }
});
app.patch('/api/admin/competences/:id', auth, adminLimiter, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id || id < 1) return res.status(400).json({ error: 'ID invalide.' });
    const categorie = sanitize(req.body.categorie, 200), icone = sanitize(req.body.icone || 'fas fa-code', 100);
    const couleur = sanitize(req.body.couleur || 'linear-gradient(135deg,#667eea,#764ba2)', 200);
    const niveau = Math.min(100, Math.max(0, parseInt(req.body.niveau || 70, 10)));
    const label_niveau = sanitize(req.body.label_niveau || 'Intermédiaire', 100);
    const items = sanitize(req.body.items || '', 1000), ordre = parseInt(req.body.ordre || 0, 10);
    if (categorie.length < 2) return res.status(400).json({ error: 'Catégorie trop courte.' });
    const r = await pool.query(`UPDATE competences SET categorie=$1,icone=$2,couleur=$3,niveau=$4,label_niveau=$5,items=$6,ordre=$7,updated_at=NOW() WHERE id=$8 RETURNING *`,
      [categorie, icone, couleur, niveau, label_niveau, items, ordre, id]);
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

// ── INIT ADMIN — Route SUPPRIMÉE pour sécurité ────────────────────────────
// Utiliser setup-admin.js à la place :
// node backend/setup-admin.js
// Cette route n'existe plus, exécuter le script setup directement.

// ── STATIC & FALLBACK ─────────────────────────────────────────────────────
app.use('/admin', express.static(path.join(__dirname, '..', 'admin'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.use(express.static(path.join(__dirname, '..', 'docs'), { etag: true, lastModified: true, dotfiles: 'deny' }));
app.get('/', (req, res) => res.sendFile(path.join(__dirname, '..', 'docs', 'index.html')));

app.use(function (req, res) {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Ressource introuvable.' });
  res.status(404).sendFile(path.join(__dirname, '..', 'docs', 'index.html'));
});
app.use(function (err, req, res, next) {
  // SÉCURITÉ : ne jamais exposer les détails d'erreur en production
  console.error('[erreur]', err.message);
  res.status(500).json({ error: 'Erreur interne.' });
});

connectDB().then(function () {
  const server = app.listen(PORT, function () {
    console.log('[Serveur] Port ' + PORT + ' — ' + (process.env.NODE_ENV || 'development'));
  });
  function shutdown() {
    server.close(function () {
      if (pool) pool.end(function () { process.exit(0); }); else process.exit(0);
    });
    setTimeout(function () { process.exit(1); }, 10000);
  }
  process.on('SIGTERM', shutdown);
  process.on('SIGINT',  shutdown);
  process.on('uncaughtException',  function (err) { console.error('[uncaughtException]', err.message); });
  process.on('unhandledRejection', function (r)   { console.error('[unhandledRejection]', r); });
}).catch(function (err) { console.error('[Démarrage impossible]', err.message); process.exit(1); });