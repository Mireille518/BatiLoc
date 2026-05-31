# 🚀 GUIDE RAPIDE - DÉMARRAGE DE L'APPLICATION

## ✅ ÉTAT ACTUEL

### Base de données WAMP : ✅ Connectée
- **4 utilisateurs** prêts à l'emploi
- **8 bâtiments** créés
- **8 locataires** enregistrés
- **7 conventions** actives

### Serveurs :
- ✅ Backend : http://localhost:3000 (en cours d'exécution)
- ✅ Frontend : http://localhost:5173 (en cours d'exécution)

---

## 🔑 COMPTES DISPONIBLES

### 1. Administrateur Principal
```
Matricule : 200000
Poste     : administrateur
```
**Accès complet** : Bâtiments, Conventions, Factures, Utilisateurs

### 2. Caissier
```
Matricule : 300000
Poste     : caissier
```
**Spécialisé** : Gestion des factures et paiements

### 3. Opérateur de saisie (AVEC DONNÉES DE TEST)
```
Matricule : em-100900
Poste     : opérateur de saisie
```
**Peut** : Voir et gérer les 7 conventions créées

### 4. Administrateur Secondaire
```
Matricule : ADMIN001
Poste     : administrateur
```
**Accès complet** comme l'administrateur principal

> ⚠️ **Important** : Si vous ne connaissez pas les mots de passe, créez un nouveau compte via l'interface d'inscription

---

## 📊 DONNÉES DE TEST DISPONIBLES

### 🏢 Bâtiments (8)
| N° | Adresse | Montant | Statut |
|----|---------|---------|--------|
| 1001 | Rue Ravalomanda | 150 000 Ar | ✅ |
| 1002 | Avenue Rainibe | 200 000 Ar | ✅ |
| 1003 | Boulevard Ratsima | 180 000 Ar | ✅ |
| 1004 | Route Ambohima | 250 000 Ar | ✅ |
| 1005 | Cité Mahazo | 175 000 Ar | ✅ |
| 1006 | Quartier Ankadif | 220 000 Ar | ❌ |
| 1007 | Zone Betsileo | 160 000 Ar | ✅ |
| 1008 | Secteur Tsaraso | 190 000 Ar | ✅ |

### 👥 Locataires (8)
1. RAKOTO Jean Marie (Commerçant)
2. RANDRIA Sophie (Enseignante)
3. RAHARIJAONA Pierre (Fonctionnaire)
4. RASOANIRINA Nicole (Infirmière)
5. ANDRIANASOLO Daniel (Médecin)
6. RAJAONAH Hortense (Avocate)
7. RAKOTONDRAZAKA Claude (Ingénieur)
8. RAMANANTSOA Elisabeth (Pharmacienne)

### 📄 Conventions (7)
- 6 conventions actives
- 1 convention annulée (pour tester le filtre)

---

## 🎯 COMMENT COMMENCER

### Étape 1 : Ouvrez l'application
Dans votre navigateur : **http://localhost:5173**

### Étape 2 : Connectez-vous

#### Option A : Utilisateur existant
1. Onglet "Connexion"
2. Entrez le matricule (ex: em-100900)
3. Sélectionnez le poste
4. Entrez le mot de passe

#### Option B : Créer un nouveau compte
1. Onglet "Inscription"
2. Suivez les 3 étapes :
   - Informations personnelles
   - Choix du rôle
   - Définir le mot de passe

### Étape 3 : Testez les fonctionnalités

#### Pour l'Opérateur de saisie :
1. Accédez à "Conventions"
2. Vous verrez les 7 conventions créées
3. Testez :
   - ✅ Recherche par nom de locataire
   - ✅ Filtre par statut
   - ✅ Création d'une nouvelle convention
   - ✅ Modification d'une convention

#### Pour le Caissier :
1. Accédez à "Factures"
2. Créez une facture pour une convention
3. Consultez les statistiques

#### Pour l'Administrateur :
1. Accès complet à tous les modules
2. Gestion des bâtiments avec upload d'images
3. Gestion des utilisateurs
4. Vue d'ensemble des statistiques

---

## 🛠️ COMMANDES UTILES

### Si les serveurs ne sont pas démarrés :

#### Démarrer le Backend
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node index.js
```

#### Démarrer le Frontend (nouveau terminal)
```powershell
cd c:\Users\Rayah\Desktop\Jess\front
npm run dev
```

### Vérifier la base de données
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node test-db-connection.js
```

### Voir les utilisateurs
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node show-users.js
```

### Réinsérer/Ajouter des données
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node seed-data-operateur.js
```

---

## 📱 INTERFACES DISPONIBLES

### 1. Page de Connexion/Inscription
- Design moderne avec progression
- Validation en temps réel
- Messages d'erreur clairs

### 2. Dashboard Administrateur
- Gestion complète des bâtiments
- Upload d'images
- CRUD utilisateurs
- Statistiques

### 3. Dashboard Caissier
- Création de factures
- Liste des conventions
- Statistiques de paiement
- Impression de factures

### 4. Dashboard Opérateur de saisie
- Liste des conventions avec filtres
- Création de nouvelles conventions
- Modification limitée (max 2 fois)
- Recherche avancée

---

## 🎨 FONCTIONNALITÉS CLÉS

### ✅ Déjà implémentées
- Authentification JWT sécurisée
- Gestion des rôles et permissions
- CRUD complet sur tous les modules
- Upload et stockage d'images (BLOB)
- Recherche et filtres
- Pagination
- Notifications (toasts)
- Design responsive
- Validation des formulaires

### 🔄 À améliorer (selon analyse)
- Export Excel/PDF
- Statistiques avancées
- Notifications par email
- Historique et audit trail
- Tests unitaires

---

## 🐛 DÉPANNAGE

### Erreur "ECONNREFUSED"
```
❌ Problème : MySQL/WAMP n'est pas démarré
✅ Solution : Vérifiez que l'icône WAMP est verte
```

### Erreur "Token expiré"
```
❌ Problème : Session expirée
✅ Solution : Déconnectez-vous et reconnectez-vous
```

### Impossible de se connecter
```
❌ Problème : Mot de passe incorrect
✅ Solution : Créez un nouveau compte via l'inscription
```

### Le frontend ne charge pas
```
❌ Problème : Serveur frontend non démarré
✅ Solution : 
cd c:\Users\Rayah\Desktop\Jess\front
npm run dev
```

### Le backend ne répond pas
```
❌ Problème : Serveur backend non démarré
✅ Solution :
cd c:\Users\Rayah\Desktop\Jess\back
node index.js
```

---

## 📚 DOCUMENTATION DISPONIBLE

1. **README.md** : Vue d'ensemble du projet
2. **CONNEXION_WAMP_REUSSIE.md** : Guide de connexion DB
3. **DONNEES_TEST_OPERATEUR.md** : Détails des données de test
4. **Ce fichier** : Guide de démarrage rapide

---

## 💡 CONSEILS

### Pour l'opérateur de saisie :
- Explorez les 7 conventions existantes
- Créez une nouvelle convention avec le bâtiment 1006 disponible
- Testez les filtres et la recherche
- Modifiez une convention (max 2 fois)

### Pour le caissier :
- Créez des factures pour les conventions actives
- Testez l'impression
- Consultez les statistiques

### Pour l'administrateur :
- Ajoutez de nouveaux bâtiments avec images
- Créez de nouveaux utilisateurs
- Explorez les statistiques globales

---

## 🎯 SCÉNARIOS DE TEST RECOMMANDÉS

### Scénario 1 : Cycle complet d'une convention
1. **Admin** : Créer un nouveau bâtiment avec image
2. **Opérateur** : Créer une convention pour ce bâtiment
3. **Caissier** : Créer une facture pour cette convention
4. **Caissier** : Imprimer la facture

### Scénario 2 : Gestion des modifications
1. **Opérateur** : Modifier une convention (1ère fois)
2. **Opérateur** : Modifier la même convention (2ème fois)
3. **Opérateur** : Tenter une 3ème modification (devrait être bloqué)
4. **Admin** : Modifier sans limite

### Scénario 3 : Recherche et filtres
1. Rechercher par nom de locataire
2. Filtrer par statut (Active/Annulée)
3. Filtrer par bâtiment
4. Combiner plusieurs filtres

---

## 🚀 C'EST PARTI !

Votre application est maintenant **100% opérationnelle** avec :
- ✅ Base de données connectée
- ✅ 4 utilisateurs de test
- ✅ 8 bâtiments
- ✅ 8 locataires
- ✅ 7 conventions
- ✅ Backend et Frontend en cours d'exécution

**Ouvrez votre navigateur : http://localhost:5173**

---

**Bon développement ! 🎉**

*Pour toute question, consultez les fichiers de documentation ou les logs des terminaux.*

---

*Dernière mise à jour : 20 novembre 2025*
