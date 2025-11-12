# 📦 Guide d'Installation et Configuration

## 🚀 Installation Rapide

### 1. Backend

```bash
cd back
npm install
```

Créer le fichier `.env` dans le dossier `back/` :

```env
DB_HOST=127.0.0.1
DB_NAME=batiment
DB_USER=root
DB_PASS=
DB_DIALECT=mysql
PORT=3000
NODE_ENV=development
SECRET_KEY=votre_secret_key_super_securise_changez_moi
FRONTEND_URL=http://localhost:5173
```

**⚠️ IMPORTANT** : Changez `SECRET_KEY` par une clé secrète forte en production !

Démarrer :
```bash
npm start
```

### 2. Frontend

```bash
cd front
npm install
```

Créer le fichier `.env` dans le dossier `front/` :

```env
VITE_API_URL=http://localhost:3000/api
```

Démarrer :
```bash
npm run dev
```

## ✅ Vérification

1. Backend accessible sur : http://localhost:3000
2. Frontend accessible sur : http://localhost:5173
3. Test de santé : http://localhost:3000/health

## 🔧 Configuration Base de Données

Assurez-vous que :
- MySQL est démarré
- La base de données `batiment` existe
- Les tables sont créées (via migrations Sequelize)

## 🐛 Dépannage

### Erreur "Cannot find module"
```bash
# Dans back/
npm install

# Dans front/
npm install
```

### Erreur de connexion DB
- Vérifier les credentials dans `back/.env`
- Vérifier que MySQL est démarré
- Vérifier que la base existe : `CREATE DATABASE batiment;`

### Erreur CORS
- Vérifier que `FRONTEND_URL` dans `back/.env` correspond à l'URL du frontend
- Vérifier que le backend est démarré avant le frontend

### Token expiré
- Se déconnecter et se reconnecter
- Vérifier que `SECRET_KEY` est défini dans `back/.env`

## 📝 Notes

- Le backend doit être démarré avant le frontend
- Les fichiers `.env` ne doivent PAS être commités (déjà dans .gitignore)
- En production, utilisez des variables d'environnement sécurisées


