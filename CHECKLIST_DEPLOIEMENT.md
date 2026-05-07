# ✅ Checklist Déploiement Sécurisé

**Portfolio Philippe** — Avant de mettre en production, vérifiez tous les points.

---

## 🔐 Variables d'Environnement

- [ ] `.env` créé (copie de `.env.example`)
- [ ] `.env` contient toutes les variables requises
- [ ] `.env` est dans `.gitignore`
- [ ] `DATABASE_URL` pointe vers PostgreSQL production
- [ ] `JWT_SECRET` >= 32 caractères aléatoires
- [ ] `ADMIN_PASSWORD` >= 16 caractères avec symboles
- [ ] `BREVO_API_KEY` valide et testé
- [ ] `NODE_ENV=production` configuré
- [ ] `PORT` correct pour votre serveur

---

## 🗄️ Base de Données

- [ ] PostgreSQL installé et running
- [ ] Connexion à la DB testée
- [ ] Tables créées (via server.js)
- [ ] Backup automatisé configuré
- [ ] Accès DB restreint (pare-feu)
- [ ] SSL activé pour connexion DB

---

## 👤 Compte Administrateur

- [ ] Script `setup-admin.js` exécuté
- [ ] Email admin confirmé
- [ ] Password admin noté SÉCURISÉ (2FA recommandé)
- [ ] Test login réussi
- [ ] Token JWT valide retourné

---

## 🛡️ Sécurité Codes

- [ ] `backend/server.js` — Pas de password en clair
- [ ] `backend/server.js` — Endpoint `/api/admin/init` supprimé
- [ ] `docs/js/script.js` — Pas d'innerHTML dangereux
- [ ] `docs/js/script.js` — CSRF token implémenté
- [ ] `.env` — Pas commité en git
- [ ] Aucune clé API exposée en clair

---

## 🚀 API Tests

### Routes publiques
- [ ] `GET /api/health` retourne `{"status":"ok"}`
- [ ] `GET /api/csrf-token` retourne un token
- [ ] `GET /api/projets` retourne liste
- [ ] `GET /api/experiences` retourne liste
- [ ] `GET /api/competences` retourne liste

### Formulaire Contact
```bash
curl -X GET http://localhost:3000/api/csrf-token
# Note le token

curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: <votre_token>" \
  -d '{"name":"Test","email":"test@example.com","phone":"","message":"Message de test"}'
# Doit retourner {"success":true}
```

### Sans CSRF Token (doit échouer)
```bash
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com","message":"test"}'
# Doit retourner 403 Forbidden
```

### Admin Routes (nécessite JWT)
```bash
# 1. Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"VotrePassword123!@#"}'
# Note le token

# 2. Accès admin
curl http://localhost:3000/api/admin/messages \
  -H "Authorization: Bearer <votre_token>"
# Doit retourner la liste des messages
```

---

## 🔒 Rate Limiting

- [ ] Contact API limité à 5/10min (prod) ou 100/10min (dev)
- [ ] Login limité à 10/15min (prod) ou 100/15min (dev)
- [ ] Tracker limité à 60/min (prod) ou 1000/min (dev)
- [ ] Requêtes globales limitées à 120/min (prod) ou 2000/min (dev)

**Test** :
```bash
# Envoyer 10 messages rapidement
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/contact \
    -H "X-CSRF-Token: token_valide"
  sleep 0.5
done
# Après 5, doit recevoir 429 Too Many Requests
```

---

## 📊 HTTPS et SSL

- [ ] Certificat SSL/TLS installé
- [ ] HTTPS redirect actif (HTTP → HTTPS)
- [ ] Headers HSTS activés
- [ ] CSP headers correctement configurés
- [ ] Certbot/auto-renouvellement configuré

---

## 📝 Logs et Monitoring

- [ ] Répertoire `logs/` existe et accessible
- [ ] Rotation des logs configurée
- [ ] Monitoring des erreurs actif (Sentry optionnel)
- [ ] Alertes configurées pour erreurs 5xx
- [ ] Accès aux logs limité (permissions fichiers)

---

## 🗑️ Nettoyage & Maintenance

- [ ] Aucun fichier de debug laissé
- [ ] `node_modules` est `.gitignore`
- [ ] Fichiers temporaires nettoyés
- [ ] Comments sensibles supprimés
- [ ] Ancien code commenté supprimé

---

## 🔄 Déploiement

### Avant la mise en ligne
```bash
# 1. Build/Test
npm run build  # si applicable

# 2. Vérifier dépendances
npm list --depth=0

# 3. Vérifier la syntaxe
node -c backend/server.js
node -c backend/setup-admin.js

# 4. Tester localement
NODE_ENV=production npm start
# Vérifier tous les tests
```

### Après la mise en ligne
- [ ] Site accessible via HTTPS
- [ ] Formulaire contact fonctionne
- [ ] Admin panel login OK
- [ ] Analytics tracking OK
- [ ] Emails Brevo fonctionnent
- [ ] Messages reçus correctement

---

## 🚨 Incidents — Action Plan

### Si quelqu'un accède au `.env`
```bash
# IMMÉDIAT
1. Changer tous les secrets:
   - JWT_SECRET
   - ADMIN_PASSWORD
   - BREVO_API_KEY

2. Redéployer:
   node backend/setup-admin.js

3. Vérifier les logs pour accès suspecte
```

### Si quelqu'un brute-force le login
```bash
# Les rate limits bloquent automatiquement
# Mais vérifier:
1. Logs pour tentatives d'accès
2. Ajouter 2FA si inquiet

# Débloquer en 15 minutes d'attente
```

### Si site est défacé
```bash
# 1. Vérifier injection XSS (unlikely, DOM API safe)
# 2. Vérifier SQL injection (unlikely, paramètres safe)
# 3. Vérifier accès BD (logs, backups)
# 4. Restore depuis backup
# 5. Audit complet de sécurité
```

---

## 📞 Support

**Fichiers de référence** :
- `SECURITY.md` — Guide complet sécurité
- `CORRECTIONS_SECURITE.md` — Résumé changements
- `.env.example` — Template variables

**Contact** : Revoir le code avec un expert sécurité si doutes.

---

## ✨ À chaque déploiement

```bash
# Checklist rapide
[ ] .env sécurisé (jamais committé)
[ ] npm dependencies à jour (npm audit)
[ ] Syntaxe OK (node -c)
[ ] HTTPS activé
[ ] Logs monitoring actif
[ ] Backup DB prêt
[ ] Tests manuels passent
```

---

**Status**: 🟢 Prêt pour production  
**Dernière vérification** : 6 mai 2026
