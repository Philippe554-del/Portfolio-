// ============================================================
//  tracker.js — Middleware + routes de tracking
//  À importer dans ton server.js / app.js principal
// ============================================================
const express = require('express');
const crypto  = require('crypto');
const { Pool } = require('pg');

const router = express.Router();

// ── Connexion PostgreSQL (réutilise ta pool existante si tu en as une) ──
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// ── Utilitaires ──────────────────────────────────────────────
function hasherIP(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + (process.env.IP_SALT || 'sel_secret')).digest('hex').slice(0, 32);
}

function genererSessionId(req) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress || '';
  const ua = req.headers['user-agent'] || '';
  const jour = new Date().toISOString().slice(0, 10);
  return crypto.createHash('sha256').update(ip + ua + jour).digest('hex').slice(0, 32);
}

// ── ROUTE 1 : Enregistrer une visite de page ─────────────────
// POST /api/tracker/visite
// Body: { page, referrer, duree_sec (optionnel) }
router.post('/visite', async (req, res) => {
  try {
    const { page = '/', referrer = '', duree_sec = 0 } = req.body;
    const sessionId = genererSessionId(req);
    const ipHash    = hasherIP(req.headers['x-forwarded-for']?.split(',')[0] || req.connection?.remoteAddress);
    const userAgent = req.headers['user-agent'] || '';

    // Insérer la visite
    await pool.query(
      `INSERT INTO visites (session_id, page, referrer, user_agent, ip_hash, duree_sec)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, page, referrer, userAgent, ipHash, duree_sec]
    );

    // Upsert session (crée ou met à jour)
    await pool.query(
      `INSERT INTO sessions (session_id, user_agent, ip_hash, nb_pages)
       VALUES ($1, $2, $3, 1)
       ON CONFLICT (session_id) DO UPDATE
       SET derniere_vue = NOW(),
           nb_pages = sessions.nb_pages + 1`,
      [sessionId, userAgent, ipHash]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/visite]', err.message);
    res.status(500).json({ ok: false });
  }
});

// ── ROUTE 2 : Mettre à jour la durée d'une visite ───────────
// POST /api/tracker/duree
// Body: { page, duree_sec }
router.post('/duree', async (req, res) => {
  try {
    const { page, duree_sec } = req.body;
    const sessionId = genererSessionId(req);

    await pool.query(
      `UPDATE visites
       SET duree_sec = $1, sortie_at = NOW()
       WHERE session_id = $2 AND page = $3
         AND sortie_at IS NULL
         AND entree_at > NOW() - INTERVAL '2 hours'`,
      [duree_sec, sessionId, page]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/duree]', err.message);
    res.status(500).json({ ok: false });
  }
});

// ── ROUTE 3 : Enregistrer une action / clic ─────────────────
// POST /api/tracker/action
// Body: { type_action, cible, page }
router.post('/action', async (req, res) => {
  try {
    const { type_action, cible = '', page = '/' } = req.body;
    const sessionId = genererSessionId(req);

    await pool.query(
      `INSERT INTO actions (session_id, type_action, cible, page)
       VALUES ($1, $2, $3, $4)`,
      [sessionId, type_action, cible, page]
    );

    // Incrémenter le compteur d'actions de la session
    await pool.query(
      `UPDATE sessions SET nb_actions = nb_actions + 1, derniere_vue = NOW()
       WHERE session_id = $1`,
      [sessionId]
    );

    res.json({ ok: true });
  } catch (err) {
    console.error('[tracker/action]', err.message);
    res.status(500).json({ ok: false });
  }
});

module.exports = router;
module.exports.pool = pool; // réexporter la pool pour analytics.js