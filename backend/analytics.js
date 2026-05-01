// ============================================================
//  analytics.js — Routes API stats pour l'admin
//  À importer dans ton server.js / app.js principal
// ============================================================
const express = require('express');
const { pool } = require('./tracker'); // réutilise la pool

const router = express.Router();

// ── Middleware auth admin (adapte selon ton système) ─────────
function authAdmin(req, res, next) {
  // Si tu as déjà un middleware d'auth admin, remplace ceci
  const token = req.headers['x-admin-token'] || req.query.token;
  if (token !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ erreur: 'Non autorisé' });
  }
  next();
}

// ── ROUTE 1 : Stats générales (dashboard) ───────────────────
// GET /api/analytics/resume
router.get('/resume', authAdmin, async (req, res) => {
  try {
    const [
      totalVisiteurs,
      visitesAujourd,
      visitesHier,
      visiteursDirect,
      pagesPop,
      actionsTop,
      parHeure,
      parJour,
      dureesMoyennes,
      visitesEnDirect
    ] = await Promise.all([

      // Total visiteurs uniques (sessions)
      pool.query(`SELECT COUNT(*) AS total FROM sessions`),

      // Visiteurs aujourd'hui
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS total FROM visites
        WHERE entree_at >= CURRENT_DATE
      `),

      // Visiteurs hier
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS total FROM visites
        WHERE entree_at >= CURRENT_DATE - INTERVAL '1 day'
          AND entree_at < CURRENT_DATE
      `),

      // Visiteurs des 30 derniers jours
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS total FROM visites
        WHERE entree_at >= NOW() - INTERVAL '30 days'
      `),

      // Pages les plus visitées (top 8)
      pool.query(`
        SELECT page,
               COUNT(*) AS vues,
               COUNT(DISTINCT session_id) AS visiteurs_uniques,
               ROUND(AVG(duree_sec)) AS duree_moy
        FROM visites
        WHERE entree_at >= NOW() - INTERVAL '30 days'
        GROUP BY page
        ORDER BY vues DESC
        LIMIT 8
      `),

      // Actions les plus fréquentes (top 8)
      pool.query(`
        SELECT type_action, cible, COUNT(*) AS nb
        FROM actions
        WHERE created_at >= NOW() - INTERVAL '30 days'
        GROUP BY type_action, cible
        ORDER BY nb DESC
        LIMIT 8
      `),

      // Visites par heure aujourd'hui (graphique)
      pool.query(`
        SELECT EXTRACT(HOUR FROM entree_at)::int AS heure,
               COUNT(DISTINCT session_id) AS visiteurs
        FROM visites
        WHERE entree_at >= CURRENT_DATE
        GROUP BY heure
        ORDER BY heure
      `),

      // Visites par jour sur 14 jours (graphique)
      pool.query(`
        SELECT DATE(entree_at) AS jour,
               COUNT(DISTINCT session_id) AS visiteurs,
               COUNT(*) AS pages_vues
        FROM visites
        WHERE entree_at >= NOW() - INTERVAL '14 days'
        GROUP BY jour
        ORDER BY jour
      `),

      // Durée moyenne sur le site
      pool.query(`
        SELECT ROUND(AVG(duree_sec)) AS duree_moy_globale
        FROM visites
        WHERE duree_sec > 0 AND duree_sec < 3600
          AND entree_at >= NOW() - INTERVAL '30 days'
      `),

      // Visiteurs actifs (dernières 5 minutes)
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS en_direct
        FROM sessions
        WHERE derniere_vue >= NOW() - INTERVAL '5 minutes'
      `)
    ]);

    res.json({
      total_visiteurs:    parseInt(totalVisiteurs.rows[0].total),
      visiteurs_aujourd:  parseInt(visitesAujourd.rows[0].total),
      visiteurs_hier:     parseInt(visitesHier.rows[0].total),
      visiteurs_30j:      parseInt(visiteursDirect.rows[0].total),
      en_direct:          parseInt(visitesEnDirect.rows[0].en_direct),
      duree_moy_sec:      parseInt(dureesMoyennes.rows[0]?.duree_moy_globale || 0),
      pages_populaires:   pagesPop.rows,
      actions_top:        actionsTop.rows,
      par_heure:          parHeure.rows,
      par_jour:           parJour.rows
    });
  } catch (err) {
    console.error('[analytics/resume]', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ── ROUTE 2 : Liste des dernières sessions ───────────────────
// GET /api/analytics/sessions?limit=20
router.get('/sessions', authAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const result = await pool.query(`
      SELECT s.session_id,
             s.premiere_vue,
             s.derniere_vue,
             s.nb_pages,
             s.nb_actions,
             s.user_agent,
             (SELECT page FROM visites WHERE session_id = s.session_id ORDER BY entree_at ASC LIMIT 1) AS page_entree,
             (SELECT page FROM visites WHERE session_id = s.session_id ORDER BY entree_at DESC LIMIT 1) AS derniere_page
      FROM sessions s
      ORDER BY s.derniere_vue DESC
      LIMIT $1
    `, [limit]);

    res.json(result.rows);
  } catch (err) {
    console.error('[analytics/sessions]', err.message);
    res.status(500).json({ erreur: err.message });
  }
});

// ── ROUTE 3 : Temps réel (polling toutes les 30s) ───────────
// GET /api/analytics/live
router.get('/live', authAdmin, async (req, res) => {
  try {
    const [enDirect, actionsRecentes] = await Promise.all([
      pool.query(`
        SELECT COUNT(DISTINCT session_id) AS en_direct
        FROM sessions WHERE derniere_vue >= NOW() - INTERVAL '5 minutes'
      `),
      pool.query(`
        SELECT a.type_action, a.cible, a.page, a.created_at,
               LEFT(a.session_id, 8) AS session_court
        FROM actions a
        ORDER BY a.created_at DESC
        LIMIT 15
      `)
    ]);

    res.json({
      en_direct:        parseInt(enDirect.rows[0].en_direct),
      actions_recentes: actionsRecentes.rows
    });
  } catch (err) {
    console.error('[analytics/live]', err.message);
    res.status(500).json({ erreur: err.message });
  }
});
ba
module.exports = router;