# 🔒 Guide de Sécurité — Portfolio Philippe

## ⚠️ IMPORTANT AVANT LE DÉPLOIEMENT

Votre code a été sécurisé contre les vulnérabilités critiques. Lisez ce guide entièrement.

---

## 🔴 Vulnérabilités Corrigées

### 1. **Password en clair (CRITIQUE)**
- ❌ **Avant** : `'portfolio@jesuusede'` visible dans le code source
- ✅ **Après** : Stocké dans `.env`, protégé par `.gitignore`

### 2. **Endpoint `/api/admin/init` exposé (CRITIQUE)**
- ❌ **Avant** : N'importe qui pouvait créer un compte admin
- ✅ **Après** : Route supprimée, utiliser `setup-admin.js` seulement

### 3. **CSRF (Cross-Site Request Forgery) (CRITIQUE)**
- ❌ **Avant** : Formulaire contact sans protection
- ✅ **Après** : Token CSRF implémenté (`/api/csrf-token`)

### 4. **XSS (Cross-Site Scripting)**
- ❌ **Avant** : `div.innerHTML` permettait injections via API
- ✅ **Après** : Utilisation de `textContent` et DOM API

### 5. **Password admin faible**
- ❌ **Avant** : 8 caractères minimum
- ✅ **Après** : 16+ caractères avec majuscules, chiffres, symboles

---

## 📋 Checklist Installation Sécurisée

### Étape 1️⃣ : Variables d'environnement

```bash
# Copier le template
cp .env.example .env

# Générer une clé JWT sécurisée (32+ caractères)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# Coller dans JWT_SECRET

# Générer un password admin fort (16+ chars)
openssl rand -base64 20
# Exemple: n4aK8$mP2xL9@qR3vB5wE
# Coller dans ADMIN_PASSWORD
```

### Étape 2️⃣ : .env complet et sécurisé

```bash
DATABASE_URL=postgresql://user:password@host:5432/portfolio
JWT_SECRET=votre_super_long_secret_de_32_chars_minimum_xxxxxxxxxxxxx
ADMIN_PASSWORD=Votre@Password123!Strong456
BREVO_API_KEY=xkeysib_xxxxx
NODE_ENV=production
PORT=3000
```

### Étape 3️⃣ : Créer le compte admin

```bash
cd backend
npm install
node setup-admin.js

# Suivre les prompts:
# Email admin: admin@votre-domaine.com
# Password: (tape ton password, min 16 chars)
# Confirmer: (re-tape)
```

### Étape 4️⃣ : Vérifier les fichiers `.gitignore`

```bash
# Vérifier que .env N'EST PAS committé
cat .gitignore

# Doit contenir:
.env
node_modules/
logs/
*.log
```

### Étape 5️⃣ : Test de sécurité

```bash
# 1. Vérifier que /api/admin/init n'existe plus
curl -X POST http://localhost:3000/api/admin/init
# Doit retourner 404

# 2. Obtenir un token CSRF
curl http://localhost:3000/api/csrf-token
# Doit retourner: {"csrfToken":"xxxxx..."}

# 3. Envoyer un message (avec CSRF token)
curl -X POST http://localhost:3000/api/contact \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: votre_token" \
  -d '{"name":"Test","email":"test@example.com","message":"Test message"}'
# Sans le token: doit retourner 403
```

---

## 🛡️ Bonnes Pratiques Appliquées

### ✅ Backend

| Sécurité | Implémentation | Statut |
|----------|---|---|
| **HTTPS** | Helmet CSP + HSTS | ✅ Activé |
| **SQL Injection** | Paramètres PostGreSQL | ✅ Sécurisé |
| **CSRF** | Token one-time use | ✅ Nouveau |
| **XSS** | textContent + DOM API | ✅ Corrigé |
| **Rate Limiting** | Express-rate-limit | ✅ Actif |
| **JWT Auth** | Tokens 8h + revocation | ✅ Sécurisé |
| **Password** | Bcrypt coût 14 | ✅ Fort |
| **IP Hash** | SHA256 anonymisé | ✅ Privé |

### ✅ Frontend

| Sécurité | Implémentation | Statut |
|----------|---|---|
| **XSS Prevention** | No innerHTML dangers | ✅ Sécurisé |
| **CSRF Protection** | Token headers | ✅ Actif |
| **Form Validation** | Client + Server | ✅ Double |
| **Rate Limit Client** | sessionStorage | ✅ Actif |

---

## 🔑 Gestion des Secrets

### ❌ NE JAMAIS

```javascript
// ❌ DANGEREUX
const pwd = 'portfolio@jesuusede'; // Visible dans le code
const apiKey = 'sk-12345'; // Exposé en clair
```

### ✅ À FAIRE

```javascript
// ✅ SÛMER
const pwd = process.env.ADMIN_PASSWORD; // Depuis .env
const apiKey = process.env.BREVO_API_KEY;
```

### 🔐 .env ne doit JAMAIS être committé

```bash
# .gitignore
.env                  # ← Toujours
.env.local
.env.production
*.log
node_modules/
```

---

## 🔄 Endpoints Sécurisés

### Routes Publiques

```javascript
// ✅ Sécurisé avec rate limit
POST /api/contact          // + CSRF token requis
GET  /api/csrf-token       // Générer token
GET  /api/health           // Health check

// ✅ Données publiques (read-only)
GET  /api/projets
GET  /api/experiences
GET  /api/competences

// ✅ Tracker avec rate limit strict
POST /api/tracker/visite
POST /api/tracker/duree
POST /api/tracker/action
```

### Routes Admin (Authentifiées)

```javascript
// ⚠️ Nécessite: Authorization: Bearer <JWT_TOKEN>
POST   /api/admin/login
POST   /api/admin/logout
GET    /api/admin/messages
PATCH  /api/admin/messages/:id/read
DELETE /api/admin/messages/:id

POST   /api/admin/projets
PATCH  /api/admin/projets/:id
DELETE /api/admin/projets/:id

// ❌ Supprimé (jamais utiliser)
// POST /api/admin/init
```

---

## 📊 Tokens CSRF — Comment ça marche

### 1️⃣ Frontend récupère un token

```javascript
fetch('/api/csrf-token')
  .then(r => r.json())
  .then(data => {
    // data.csrfToken = "abcd1234..."
  });
```

### 2️⃣ Token inclus dans les requêtes POST

```javascript
fetch('/api/contact', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-CSRF-Token': csrfToken  // ← Le token
  },
  body: JSON.stringify({...})
});
```

### 3️⃣ Backend valide avant de traiter

```javascript
// Si token manquant ou invalide:
// 403 Forbidden - Token CSRF invalide
```

**Avantage** : Un site malveillant NE PEUT PAS envoyer de requête valide car il n'a pas accès au token.

---

## 🚨 Incidents & Réponse

### Si quelqu'un a accès au code source

```bash
# 1. IMMÉDIATEMENT : Changer le mot de passe admin
node backend/setup-admin.js

# 2. Révoquer TOUS les JWT tokens
# (Les anciens tokens restent valides 8h)
# Ajouter une date d'expiration globale en env si besoin

# 3. Vérifier les logs d'accès
tail -f logs/app.log

# 4. Auditer les messages reçus
# Admin panel → Messages → Vérifier la liste complète
```

### Si quelqu'un spam le formulaire

```bash
# Rate limit déjà actif:
# - 5 messages par 10 minutes (production)
# - 100 messages par 10 minutes (développement)
# Les IPs sont hashées + anonymisées

# Vérifier les logs:
curl http://localhost:3000/api/analytics/live \
  -H "Authorization: Bearer <admin_token>"
```

### Si vous oubliez le password admin

```bash
# Pas de "reset password" pour protéger les comptes

# Solution: Réinitialiser via script
node backend/setup-admin.js
# Crée ou met à jour le compte
```

---

## 📈 Monitoring Recommandé

Ajouter après déploiement en production:

```javascript
// Sentry pour erreurs
const Sentry = require('@sentry/node');
Sentry.init({ dsn: process.env.SENTRY_DSN });

// Winston pour logs structurés
const winston = require('winston');
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});
```

---

## 📚 Ressources Sécurité

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/sql-syntax.html)

---

## ✅ Checklist Avant Production

- [ ] `.env` créé avec tous les secrets
- [ ] `.env` **NOT** en git (vérifier `.gitignore`)
- [ ] `setup-admin.js` a créé un compte
- [ ] Tous les tests CURL passent
- [ ] HTTPS activé (certificat SSL/TLS)
- [ ] Database backup automatisé
- [ ] Logs sauvegardés quelque part
- [ ] Rate limits testés
- [ ] CORS origins vérifiés
- [ ] Monitoring en place (Sentry/Winston)

---

## 🎯 Prochaines Étapes (Optionnel)

### 🟢 Court terme (3 mois)

- [ ] 2FA (TOTP) pour admin
- [ ] API Keys pour accès programmatique
- [ ] Audit logs (qui a fait quoi et quand)

### 🟡 Moyen terme (6 mois)

- [ ] WAF (Cloudflare/AWS)
- [ ] Audit de sécurité professionnel
- [ ] Penetration testing

### 🔴 Long terme (1 an)

- [ ] OAuth/SSO (Google, GitHub)
- [ ] Rate limiting par utilisateur
- [ ] Chiffrement end-to-end pour messages sensibles

---

**Questions ?** Relire ce document régulièrement. La sécurité c'est continu ! 🚀
