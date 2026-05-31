# 🔐 DOCUMENTATION - SYSTÈME DE RÉINITIALISATION DE MOT DE PASSE

## 📋 RÉSUMÉ DES PROBLÈMES IDENTIFIÉS

### 1. **Limitation à 3 utilisateurs par poste**
- **Situation actuelle** : Le système ne limitait pas le nombre d'utilisateurs par poste
- **Solution implémentée** : Limitation de **3 utilisateurs maximum par poste** (sauf pour les administrateurs qui peuvent avoir jusqu'à 4 pour la sécurité)

### 2. **Problème si l'admin oublie son mot de passe**
- **Situation actuelle** : Aucun système de réinitialisation existant
- **Solution implémentée** : Système complet de réinitialisation avec **clé de récupération d'urgence pour admin**

---

## 🔧 SOLUTIONS IMPLÉMENTÉES

### ✅ 1. LIMITATION DES UTILISATEURS PAR POSTE

**Logique implémentée :**
- Maximum **3 utilisateurs** par poste (caissier, opérateur de saisie)
- Maximum **4 administrateurs** (pour permettre un admin de secours)
- Vérification lors de l'inscription (`/register`)
- Vérification lors de l'approbation des demandes (`/demandes-creation/:id`)

**Route de vérification :**
```
POST /api/user/check-user-limit
Body: { "poste": "caissier" }
Response: {
  "canCreate": true/false,
  "currentCount": 2,
  "maxAllowed": 3,
  "remaining": 1
}
```

---

### ✅ 2. SYSTÈME DE RÉINITIALISATION DE MOT DE PASSE

#### **A. Réinitialisation normale (tous utilisateurs)**

**Étape 1 : Demander un code de réinitialisation**
```
POST /api/user/reset-password/request
Body: {
  "matricule": "200000",
  "poste": "administrateur",
  "email": "admin@demo.local" (optionnel)
}
```

**Fonctionnement :**
- Génère un code à 6 chiffres valable **15 minutes**
- En développement : Le code est renvoyé dans la réponse (visible dans les logs)
- En production : Le code devrait être envoyé par email/SMS

**Étape 2 : Réinitialiser avec le code**
```
POST /api/user/reset-password/verify
Body: {
  "matricule": "200000",
  "poste": "administrateur",
  "code": "123456",
  "newPassword": "nouveauMotDePasse"
}
```

---

#### **B. Clé de récupération d'urgence (ADMIN UNIQUEMENT)**

**Problème résolu :** Si l'admin oublie son mot de passe et n'a pas accès à son email/code.

**Solution :** Clé de récupération stockée dans le fichier `.env`

**Configuration :**
1. Créer/modifier le fichier `.env` dans le dossier `back/`
2. Ajouter :
```env
ADMIN_RECOVERY_KEY=VotreCleSecrete2024
```

**Utilisation :**
```
POST /api/user/reset-password/verify
Body: {
  "matricule": "200000",
  "poste": "administrateur",
  "recoveryKey": "VotreCleSecrete2024",
  "newPassword": "nouveauMotDePasse"
}
```

**⚠️ IMPORTANT :**
- Cette clé permet de bypasser le code de réinitialisation
- **Uniquement pour les administrateurs**
- **Changez la clé par défaut en production !**
- Conservez cette clé en sécurité (coffre-fort, gestionnaire de mots de passe)

---

## 📱 INTERFACE UTILISATEUR

### Modal de réinitialisation
- Accessible via le lien **"Forgot Password?"** sur la page de connexion
- Design neumorphique cohérent avec le reste de l'interface
- Étapes :
  1. Saisir matricule + poste (+ clé de récupération si admin)
  2. Saisir le code reçu + nouveau mot de passe

---

## 🔒 SÉCURITÉ

### Mesures de sécurité implémentées :

1. **Codes à durée limitée** : 15 minutes
2. **Codes à usage unique** : Chaque code ne peut être utilisé qu'une fois
3. **Validation du matricule + poste** : Double vérification
4. **Clé de récupération admin** : Stockée dans `.env`, pas dans le code
5. **Hashing des mots de passe** : bcrypt avec salt

---

## 🚨 CAS D'URGENCE - ADMIN BLOQUÉ

### Si l'admin a oublié son mot de passe :

**Option 1 : Utiliser la clé de récupération**
1. Ouvrir la page de connexion
2. Cliquer sur "Forgot Password?"
3. Entrer le matricule + poste "administrateur"
4. Entrer la **clé de récupération** (stockée dans `.env` : `ADMIN_RECOVERY_KEY`)
5. Entrer le nouveau mot de passe

**Option 2 : Réinitialiser via un autre admin**
1. Se connecter avec un autre compte admin (si disponible)
2. Aller dans la section "Utilisateurs" du dashboard admin
3. Modifier le mot de passe de l'admin bloqué

**Option 3 : Réinitialisation manuelle en base de données**
1. Accéder à la base de données MySQL
2. Hasher un nouveau mot de passe avec bcrypt
3. Mettre à jour la table `utilisateur`

```sql
-- Exemple : Mot de passe "admin123" hashé
UPDATE utilisateur 
SET mdp = '$2a$10$...' 
WHERE matricule = '200000' AND poste = 'administrateur';
```

---

## 📝 NOTES IMPORTANTES

1. **Limitation des utilisateurs** :
   - Pour les postes normaux : **3 maximum**
   - Pour les administrateurs : **4 maximum** (sécurité)

2. **Clé de récupération** :
   - Par défaut : `CHANGEZ_MOI_EN_PRODUCTION_2024`
   - **CHANGEZ-LA immédiatement en production !**
   - Stockez-la en sécurité

3. **Codes de réinitialisation** :
   - Stockés dans `back/data/reset-codes.json`
   - Nettoyage automatique des codes expirés (à implémenter si nécessaire)

---

## 🔄 WORKFLOW COMPLET

### Connexion normale :
1. Utilisateur saisit matricule + poste + mot de passe
2. Système vérifie si l'utilisateur existe
3. Si non existant → Crée une demande de compte (approbation admin requise)
4. Si existant → Vérifie le mot de passe
5. Si correct → Génère token JWT et connecte

### Inscription :
1. Vérification de la limite (3 utilisateurs max par poste)
2. Si limite atteinte → Refuse l'inscription
3. Sinon → Crée le compte

### Réinitialisation :
1. Utilisateur clique sur "Forgot Password?"
2. Saisit matricule + poste (+ clé de récupération si admin)
3. Système génère un code (ou utilise la clé)
4. Utilisateur saisit le code + nouveau mot de passe
5. Système valide et met à jour le mot de passe

---

## 🛠️ FICHIERS MODIFIÉS

1. **back/api/user.js** :
   - Route `/reset-password/request` : Génération de code
   - Route `/reset-password/verify` : Réinitialisation
   - Route `/check-user-limit` : Vérification de limite
   - Limite ajoutée dans `/register` et `/demandes-creation/:id`

2. **front/src/App.tsx** :
   - Modal de réinitialisation
   - Handlers pour la réinitialisation
   - Intégration avec le lien "Forgot Password?"

3. **front/src/style.css** :
   - Styles pour le modal de réinitialisation

---

## ⚠️ RECOMMANDATIONS

1. **En production** :
   - Changez `ADMIN_RECOVERY_KEY` dans `.env`
   - Implémentez l'envoi de codes par email/SMS
   - Ne renvoyez jamais le code dans la réponse API

2. **Sécurité** :
   - Limitez le nombre de tentatives de réinitialisation
   - Ajoutez un système de rate limiting
   - Conservez un log des réinitialisations

3. **Base de données** :
   - Considérez stocker les codes dans une table dédiée plutôt qu'en JSON
   - Implémentez un nettoyage automatique des codes expirés




















