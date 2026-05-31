# 🚀 Démarrage Rapide

## ⚡ Installation Express (5 minutes)

### Étape 1 : Backend
```bash
cd back
npm install
```

Créez `back/.env` :
```env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=
PORT=3000
SECRET_KEY=changez_moi_en_production_123456789
FRONTEND_URL=http://localhost:5173
```

Démarrez :
```bash
npm start
```

### Étape 2 : Frontend
```bash
cd front
npm install
```

Créez `front/.env` :
```env
VITE_API_URL=http://localhost:3000/api
```

Démarrez :
```bash
npm run dev
```

### Étape 3 : Vérification
- ✅ Backend : http://localhost:3000/health
- ✅ Frontend : http://localhost:5173
- ✅ Connectez-vous avec vos identifiants

## 🎯 Fonctionnalités Disponibles

### ✅ Sécurité
- Authentification JWT sur toutes les routes
- Validation stricte des données
- Gestion automatique des tokens expirés

### ✅ Dashboard Caissier
- Création de factures
- Liste des factures avec pagination
- Statistiques en temps réel
- Consultation des conventions

### ✅ Améliorations
- Pagination sur toutes les listes
- Recherche et filtres avancés
- Notifications toast
- Design cohérent

## 📚 Documentation Complète

- `README.md` - Documentation générale
- `INSTALLATION.md` - Guide d'installation détaillé
- `GUIDE_UTILISATION.md` - Guide utilisateur
- `ANALYSE_ET_AMELIORATIONS.md` - Analyse complète
- `RESUME_AMELIORATIONS.md` - Résumé des améliorations

## ⚠️ Important

1. **Changez `SECRET_KEY`** dans `back/.env` avant la production
2. Les fichiers `.env` ne doivent **jamais** être commités
3. Démarrez le backend **avant** le frontend

## 🆘 Problème ?

1. Vérifiez que MySQL est démarré
2. Vérifiez les credentials dans `back/.env`
3. Vérifiez que les ports 3000 et 5173 sont libres
4. Consultez `INSTALLATION.md` pour plus de détails


