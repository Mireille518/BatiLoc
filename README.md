# 🏢 Système de Gestion de Conventions de Bâtiment

Application web complète pour la gestion des conventions de location de bâtiments avec gestion des factures et des utilisateurs.

## 🚀 Fonctionnalités

### ✅ Implémentées
- **Authentification sécurisée** avec JWT
- **Gestion des rôles** : Administrateur, Caissier, Rédacteur
- **Gestion des bâtiments** : CRUD complet avec images
- **Gestion des conventions** : Création, modification, annulation
- **Gestion des factures** : Création et suivi des factures
- **Dashboard Caissier** : Interface complète pour la gestion des paiements
- **Recherche et filtres** : Recherche avancée avec pagination
- **Sécurité** : Middleware d'authentification, validation, gestion d'erreurs
- **Notifications** : Système de toasts pour le feedback utilisateur

### 🔄 En cours / À améliorer
- Export Excel/PDF
- Statistiques avancées
- Notifications par email
- Historique et audit trail

## 📋 Prérequis

- Node.js (v14 ou supérieur)
- MySQL
- npm ou yarn

## 🛠️ Installation

### Backend

```bash
cd back
npm install
```

Créer un fichier `.env` à la racine du dossier `back` :

```env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=
DB_DIALECT=mysql
PORT=3000
NODE_ENV=development
SECRET_KEY=votre_secret_key_super_securise
FRONTEND_URL=http://localhost:5173
```

Démarrer le serveur :
```bash
npm start
```

### Frontend

```bash
cd front
npm install
```

Créer un fichier `.env` à la racine du dossier `front` :

```env
VITE_API_URL=http://localhost:3000/api
```

Démarrer l'application :
```bash
npm run dev
```

## 📁 Structure du projet

```
managebatiment/
├── back/
│   ├── api/              # Routes API
│   ├── config/           # Configuration
│   ├── connection/       # Connexion DB
│   ├── middleware/       # Middlewares (auth, validation, errors)
│   ├── models/           # Modèles Sequelize
│   └── index.js          # Point d'entrée
├── front/
│   ├── src/
│   │   ├── components/   # Composants réutilisables
│   │   ├── config/       # Configuration API
│   │   ├── hooks/        # Hooks React
│   │   ├── AdminDash.jsx # Dashboard Admin
│   │   ├── CaisseDash.jsx # Dashboard Caissier
│   │   ├── Redacteur.jsx  # Dashboard Rédacteur
│   │   └── ...
│   └── ...
└── README.md
```

## 🔐 Sécurité

- ✅ Authentification JWT
- ✅ Middleware de protection des routes
- ✅ Validation des données
- ✅ Gestion centralisée des erreurs
- ✅ CORS configuré
- ✅ Variables d'environnement

## 📝 API Endpoints

### Authentification
- `POST /api/user/login` - Connexion
- `POST /api/user/register` - Inscription
- `GET /api/user/profile` - Profil utilisateur

### Bâtiments
- `GET /api/batiments` - Liste (avec pagination)
- `GET /api/batiments/:id` - Détails
- `POST /api/batiments` - Créer
- `PUT /api/batiments/:id` - Modifier
- `DELETE /api/batiments/:id` - Supprimer

### Conventions
- `GET /api/conventions` - Liste (avec pagination et filtres)
- `GET /api/conventions/:id` - Détails
- `POST /api/conventions` - Créer
- `PUT /api/conventions/:id` - Modifier
- `DELETE /api/conventions/:id` - Supprimer

### Factures
- `GET /api/factures` - Liste (avec pagination)
- `GET /api/factures/:id` - Détails
- `POST /api/factures` - Créer (réservé au caissier)
- `PUT /api/factures/:id` - Modifier
- `DELETE /api/factures/:id` - Supprimer (réservé à l'admin)
- `GET /api/factures/stats/summary` - Statistiques

## 🎨 Technologies utilisées

### Backend
- Express.js
- Sequelize (ORM)
- MySQL
- JWT
- Multer (upload images)
- bcryptjs

### Frontend
- React
- React Router
- Vite
- Font Awesome
- Bootstrap (partiel)

## 👥 Rôles et permissions

- **Administrateur** : Accès complet (bâtiments, utilisateurs, conventions)
- **Caissier** : Gestion des factures et paiements
- **Rédacteur** : Création et modification de conventions (limite de 2 modifications)

## 🐛 Dépannage

### Erreur de connexion à la base de données
- Vérifier les credentials dans `.env`
- Vérifier que MySQL est démarré
- Vérifier que la base de données existe

### Erreur CORS
- Vérifier que `FRONTEND_URL` dans `.env` correspond à l'URL du frontend
- Vérifier que le backend est démarré

### Token expiré
- Se déconnecter et se reconnecter
- Vérifier que `SECRET_KEY` est défini dans `.env`

## 📄 Licence

ISC

## 👨‍💻 Auteur

Développé pour la gestion des conventions de bâtiment FCE


