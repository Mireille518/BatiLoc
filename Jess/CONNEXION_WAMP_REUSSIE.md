# 🚀 CONNEXION RÉUSSIE À LA BASE DE DONNÉES WAMP

## ✅ Statut : CONNECTÉ ET OPÉRATIONNEL

### 📊 Résumé de la connexion

**Date de connexion** : 20 novembre 2025

#### Serveurs actifs :
- ✅ **Backend** : http://localhost:3000 (Express + MySQL)
- ✅ **Frontend** : http://localhost:5173 (React + Vite)
- ✅ **Base de données** : WAMP MySQL (batiment)

---

## 👥 UTILISATEURS DISPONIBLES

Vous avez **4 utilisateurs** dans votre base de données :

### 1. Administrateur Principal
```
Matricule : 200000
Email     : admin@demo.local
Contact   : 0320000003
Poste     : administrateur
```

### 2. Caissier
```
Matricule : 300000
Email     : caissier@demo.local
Contact   : 0320000002
Poste     : caissier
```

### 3. Administrateur Secondaire
```
Matricule : ADMIN001
Email     : admin@example.com
Contact   : 0000000000
Poste     : administrateur
```

### 4. Opérateur de saisie
```
Matricule : em-100900
Email     : operateur@demo.local
Contact   : 0320000001
Poste     : opérateur de saisie
```

---

## 🔐 COMMENT SE CONNECTER

### Option 1 : Utiliser un compte existant

1. Ouvrez votre navigateur : http://localhost:5173
2. Remplissez le formulaire de connexion :
   - **Matricule** : (ex: 200000, 300000, ADMIN001, em-100900)
   - **Poste** : Sélectionnez le poste correspondant
   - **Mot de passe** : Celui défini lors de la création du compte

> ⚠️ **Note** : Si vous ne connaissez pas les mots de passe, passez à l'Option 2

### Option 2 : Créer un nouveau compte

1. Cliquez sur l'onglet **"Inscription"**
2. Suivez les 3 étapes :
   - **Étape 1** : Informations personnelles
   - **Étape 2** : Choix du rôle
   - **Étape 3** : Définir le mot de passe
3. Une fois inscrit, connectez-vous avec vos nouveaux identifiants

---

## 📁 STRUCTURE DE LA BASE DE DONNÉES

### Tables disponibles :
| Table | Nombre d'enregistrements | Description |
|-------|--------------------------|-------------|
| `utilisateur` | 4 | Utilisateurs du système |
| `mbatiment` | 0 | Bâtiments à gérer |
| `convention` | 0 | Conventions de location |
| `facture` | 0 | Factures générées |
| `locataire` | 0 | Locataires enregistrés |

---

## 🛠️ COMMANDES UTILES

### Démarrer les serveurs

#### Backend (dans un terminal PowerShell) :
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node index.js
```

#### Frontend (dans un autre terminal PowerShell) :
```powershell
cd c:\Users\Rayah\Desktop\Jess\front
npm run dev
```

### Tester la connexion à la base de données
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node test-db-connection.js
```

### Afficher les utilisateurs
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node show-users.js
```

---

## 🔧 CONFIGURATION

### Fichier `.env` Backend (back/.env)
```env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=
DB_DIALECT=mysql
PORT=3000
NODE_ENV=development
SECRET_KEY=batiment_secret_key_2025_secure_random_string_change_in_production
FRONTEND_URL=http://localhost:5173
```

### Fichier `.env` Frontend (front/.env)
```env
VITE_API_URL=http://localhost:3000/api
```

---

## 🎯 PROCHAINES ÉTAPES

1. **Connectez-vous** à l'application web
2. **Testez les fonctionnalités** selon votre rôle :
   - **Administrateur** : Gestion complète (bâtiments, utilisateurs, conventions)
   - **Caissier** : Gestion des factures
   - **Opérateur de saisie** : Création de conventions

3. **Ajoutez des données** :
   - Créez des bâtiments
   - Ajoutez des conventions
   - Générez des factures

---

## 🐛 DÉPANNAGE

### Le serveur backend ne démarre pas
```powershell
# Vérifiez que WAMP est démarré (icône verte)
# Vérifiez que le port 3000 n'est pas utilisé
netstat -ano | findstr :3000
```

### Le frontend ne se connecte pas
```powershell
# Vérifiez que le backend tourne
# Vérifiez l'URL dans front/.env : VITE_API_URL=http://localhost:3000/api
```

### Erreur de connexion à la base de données
```powershell
# Vérifiez que MySQL est actif dans WAMP
# Testez la connexion avec :
cd c:\Users\Rayah\Desktop\Jess\back
node test-db-connection.js
```

### Mot de passe oublié
Deux solutions :
1. **Créer un nouveau compte** via l'interface d'inscription
2. **Réinitialiser via phpMyAdmin** :
   - Ouvrez http://localhost/phpmyadmin
   - Sélectionnez la base `batiment`
   - Table `utilisateur`
   - Modifiez le champ `mdp` pour l'utilisateur souhaité

---

## 📞 SUPPORT

Pour toute question ou problème :
1. Vérifiez d'abord les sections ci-dessus
2. Consultez les fichiers de documentation dans le projet
3. Vérifiez les logs dans les terminaux

---

## ✨ FONCTIONNALITÉS DISPONIBLES

### Selon les rôles :

#### 👨‍💼 Administrateur
- ✅ Gestion complète des bâtiments (CRUD)
- ✅ Gestion des utilisateurs
- ✅ Gestion des conventions
- ✅ Accès aux statistiques
- ✅ Suppression de factures

#### 💰 Caissier
- ✅ Création de factures
- ✅ Gestion des paiements
- ✅ Consultation des conventions
- ✅ Statistiques des factures

#### ✍️ Opérateur de saisie
- ✅ Création de conventions
- ✅ Modification de conventions (max 2 fois)
- ✅ Consultation des bâtiments

---

**🎉 Félicitations ! Votre application est maintenant connectée à la base de données WAMP et prête à l'emploi !**

---

*Dernière mise à jour : 20 novembre 2025*
