# 🔍 Diagnostic Problème d'Authentification

## 🐛 Problème : "Erreur serveur" à la connexion

### ✅ Étapes de Diagnostic

#### 1. Vérifier que le backend démarre correctement

```bash
cd back
npm start
```

**Vérifiez dans la console :**
- ✅ "✅ Connexion à la base de données réussie"
- ✅ "🚀 Serveur démarré sur le port 3000"
- ❌ Si erreur DB → Voir section "Problème Base de Données"

#### 2. Vérifier la connexion à la base de données

```bash
cd back
node test-connection.js
```

**Si erreur :**
- Vérifiez que MySQL est démarré
- Vérifiez les credentials dans `back/.env`
- Créez la base si nécessaire : `CREATE DATABASE batiment;`

#### 3. Vérifier que le fichier .env existe

**Dans `back/` :**
```bash
# Windows PowerShell
Test-Path .env

# Si False, créez le fichier :
Copy-Item .env.example .env
# Puis éditez .env avec vos valeurs
```

**Contenu minimum de `back/.env` :**
```env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=
PORT=3000
SECRET_KEY=votre_cle_secrete_ici
FRONTEND_URL=http://localhost:5173
```

#### 4. Tester l'API directement

**Ouvrez un terminal et testez :**
```bash
# Test simple
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d "{\"matricule\":\"test\",\"poste\":\"administrateur\",\"mdp\":\"test\"}"
```

**Ou utilisez le script de test :**
```bash
cd back
node test-api.js
# Dans un autre terminal, testez la connexion
```

#### 5. Vérifier les logs du backend

**Quand vous essayez de vous connecter, regardez la console du backend :**
- Y a-t-il des erreurs affichées ?
- Y a-t-il "Erreur recherche utilisateur" ?
- Y a-t-il "Erreur comparaison password" ?

#### 6. Vérifier la console du navigateur

**Ouvrez les DevTools (F12) → Console :**
- Y a-t-il des erreurs CORS ?
- Y a-t-il des erreurs réseau ?
- Quelle est l'URL exacte appelée ?

**Onglet Network :**
- La requête POST `/api/user/login` est-elle envoyée ?
- Quel est le statut de la réponse (200, 401, 500, etc.) ?
- Quelle est la réponse exacte du serveur ?

## 🔧 Solutions Courantes

### Problème 1 : Base de données non connectée

**Symptômes :**
- "❌ Erreur de connexion à la base de données" dans la console
- Backend crash au démarrage

**Solution :**
```bash
# 1. Vérifier MySQL
mysql -u root -p

# 2. Créer la base si nécessaire
CREATE DATABASE IF NOT EXISTS batiment;

# 3. Vérifier .env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=votre_mot_de_passe
```

### Problème 2 : Fichier .env manquant ou incorrect

**Symptômes :**
- "⚠️ ATTENTION: Aucune clé secrète trouvée"
- Erreurs de configuration

**Solution :**
```bash
cd back
# Copier l'exemple
Copy-Item .env.example .env
# Éditer avec vos valeurs
notepad .env
```

### Problème 3 : CORS bloqué

**Symptômes :**
- Erreur CORS dans la console du navigateur
- "Access-Control-Allow-Origin" manquant

**Solution :**
Vérifiez dans `back/index.js` que :
```javascript
app.use(cors({
  origin: FRONTEND_URL, // Doit correspondre à l'URL du frontend
  credentials: true
}));
```

### Problème 4 : Route /api/user bloquée par erreur

**Symptômes :**
- 401 ou 403 sur /api/user/login
- "Token manquant" alors qu'on essaie de se connecter

**Solution :**
Vérifiez que dans `back/index.js`, la route user est **AVANT** le middleware auth :
```javascript
// ✅ CORRECT - Routes publiques AVANT auth
app.use("/api/user", require("./api/user"));
app.use("/api/batiments", authenticateToken, require("./api/batiment"));
```

### Problème 5 : Erreur dans la requête frontend

**Symptômes :**
- URL incorrecte
- Headers manquants
- Body mal formaté

**Solution :**
Vérifiez dans `front/src/App.tsx` :
- `API_BASE_URL` est correct
- La requête inclut `Content-Type: application/json`
- Le body est bien stringifié

## 🧪 Test Manuel Rapide

### Test 1 : Backend répond
```bash
curl http://localhost:3000/health
```
**Attendu :** `{"status":"OK","timestamp":"..."}`

### Test 2 : Route login accessible
```bash
curl -X POST http://localhost:3000/api/user/login \
  -H "Content-Type: application/json" \
  -d "{\"matricule\":\"test\",\"poste\":\"administrateur\",\"mdp\":\"test\"}"
```

**Attendu :** Réponse JSON (même si erreur 401, c'est normal si l'utilisateur n'existe pas)

### Test 3 : Base de données accessible
```bash
cd back
node test-connection.js
```

## 📋 Checklist de Vérification

- [ ] Backend démarre sans erreur
- [ ] Connexion DB réussie (message ✅)
- [ ] Fichier `back/.env` existe et est correct
- [ ] `SECRET_KEY` est défini dans `.env`
- [ ] MySQL est démarré
- [ ] Base de données `batiment` existe
- [ ] Route `/api/user` est publique (pas de middleware auth)
- [ ] Frontend utilise la bonne URL (`VITE_API_URL`)
- [ ] Pas d'erreur CORS dans la console
- [ ] Les logs backend montrent la requête reçue

## 🆘 Si le problème persiste

1. **Activez les logs détaillés :**
   Dans `back/index.js`, ajoutez avant les routes :
   ```javascript
   app.use((req, res, next) => {
     console.log(`${req.method} ${req.path}`, req.body);
     next();
   });
   ```

2. **Vérifiez les erreurs complètes :**
   Dans `back/api/user.js`, ligne 207, le catch devrait afficher plus de détails

3. **Testez avec Postman/Insomnia :**
   - POST `http://localhost:3000/api/user/login`
   - Headers: `Content-Type: application/json`
   - Body: `{"matricule":"...","poste":"administrateur","mdp":"..."}`

4. **Vérifiez la version de Node :**
   ```bash
   node --version
   # Doit être >= 14
   ```


