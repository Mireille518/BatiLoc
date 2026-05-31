# 🏢 Instructions - Création de 7 Bâtiments avec GPS

## 📋 Vue d'ensemble

Ce guide explique comment ajouter le champ **superficie** (en m²) aux bâtiments et créer 7 nouveaux bâtiments avec des coordonnées GPS.

---

## 🔧 Étape 1 : Ajouter la colonne superficie à la base de données

### Option A : Utiliser la migration Sequelize (Recommandé)

```bash
cd back
npx sequelize-cli db:migrate
```

### Option B : Exécuter le script SQL manuellement

1. Ouvrez **phpMyAdmin** dans WAMP
2. Sélectionnez votre base de données (`batiment`)
3. Allez dans l'onglet **"SQL"**
4. Copiez et exécutez le contenu du fichier `add-superficie-column.sql`

```sql
ALTER TABLE `mbatiment` 
ADD COLUMN `superficie` DOUBLE NULL 
COMMENT 'Superficie du terrain en mètres carrés'
AFTER `longitude`;
```

---

## 🚀 Étape 2 : Créer les 7 bâtiments avec coordonnées GPS

### Exécuter le script

```bash
cd back
node create-7-batiments-gps.js
```

### Résultat attendu

Le script va créer **7 bâtiments** avec les caractéristiques suivantes :

| N° | Adresse | Statut | Superficie | Coordonnées GPS |
|----|---------|--------|------------|-----------------|
| 2001 | Avenue Indépendance | ✅ Actif | 250.5 m² | -21.4526, 47.0866 |
| 2002 | Rue de la République | ❌ Indisponible | 320.75 m² | -21.4556, 47.0861 |
| 2003 | Boulevard Tsiranana | ✅ Actif | 180.25 m² | -21.4506, 47.0876 |
| 2004 | Route Nationale 7 | ❌ Indisponible | 450.0 m² | -21.4486, 47.0846 |
| 2005 | Avenue de la Gare | ✅ Actif | 195.5 m² | -21.4546, 47.0836 |
| 2006 | Cité Universitaire | ❌ Indisponible | 380.0 m² | -21.4566, 47.0886 |
| 2007 | Zone Industrielle | ✅ Actif | 520.75 m² | -21.4531, 47.0826 |

### Caractéristiques

- ✅ **4 bâtiments actifs** (statut = true)
- ❌ **3 bâtiments indisponibles** (statut = false)
- 📍 **Tous avec coordonnées GPS** (latitude/longitude)
- 📏 **Tous avec superficie** en mètres carrés
- 🏙️ **Tous dans Fianarantsoa** avec quartiers différents

---

## 📊 Détails des bâtiments créés

### Bâtiment #2001 - Actif
- **Adresse** : Avenue Indépendance
- **Quartier** : Centre-ville
- **Superficie** : 250.5 m²
- **Loyer** : 180,000 Ar
- **Description** : Bâtiment résidentiel moderne

### Bâtiment #2002 - Indisponible
- **Adresse** : Rue de la République
- **Quartier** : Quartier Sud
- **Superficie** : 320.75 m²
- **Loyer** : 220,000 Ar
- **Description** : Bâtiment en rénovation

### Bâtiment #2003 - Actif
- **Adresse** : Boulevard Tsiranana
- **Quartier** : Zone Est
- **Superficie** : 180.25 m²
- **Loyer** : 150,000 Ar
- **Description** : Appartement meublé

### Bâtiment #2004 - Indisponible
- **Adresse** : Route Nationale 7
- **Quartier** : Périphérie Nord
- **Superficie** : 450.0 m²
- **Loyer** : 280,000 Ar
- **Description** : Maison avec jardin

### Bâtiment #2005 - Actif
- **Adresse** : Avenue de la Gare
- **Quartier** : Quartier Gare
- **Superficie** : 195.5 m²
- **Loyer** : 165,000 Ar
- **Description** : Studio proche gare

### Bâtiment #2006 - Indisponible
- **Adresse** : Cité Universitaire
- **Quartier** : Campus
- **Superficie** : 380.0 m²
- **Loyer** : 240,000 Ar
- **Description** : Résidence étudiante

### Bâtiment #2007 - Actif
- **Adresse** : Zone Industrielle
- **Quartier** : Zone Ouest
- **Superficie** : 520.75 m²
- **Loyer** : 300,000 Ar
- **Description** : Entrepôt commercial

---

## ✅ Vérification

### Vérifier que la colonne superficie existe

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mbatiment'
  AND COLUMN_NAME = 'superficie';
```

### Vérifier les bâtiments créés

```sql
SELECT 
    numBat,
    adresse,
    ville,
    quartier,
    latitude,
    longitude,
    superficie,
    montant,
    statut
FROM mbatiment
WHERE numBat BETWEEN 2001 AND 2007
ORDER BY numBat;
```

---

## 🔄 Modifications apportées

### 1. Modèle `mbatiment.js`
- ✅ Ajout du champ `superficie` (DOUBLE, nullable)

### 2. Migration
- ✅ Fichier : `20250124000000-add-superficie-batiment.js`
- ✅ Ajoute la colonne `superficie` à la table `mbatiment`

### 3. API `batiment.js`
- ✅ Route `POST /batiments` : Accepte le champ `superficie`
- ✅ Route `PUT /batiments/:numBat` : Permet de mettre à jour `superficie`

### 4. Script de création
- ✅ Fichier : `create-7-batiments-gps.js`
- ✅ Crée 7 bâtiments avec coordonnées GPS et superficie

---

## 🎯 Utilisation dans l'API

### Créer un bâtiment avec superficie

```javascript
POST /api/batiments
Content-Type: multipart/form-data

{
  numBat: 2008,
  adresse: "Nouvelle Adresse",
  montant: 200000,
  statut: true,
  ville: "Fianarantsoa",
  quartier: "Quartier Test",
  latitude: -21.4536,
  longitude: 47.0856,
  superficie: 300.5,  // ← Nouveau champ
  image: <fichier image>
}
```

### Mettre à jour la superficie

```javascript
PUT /api/batiments/2001
Content-Type: multipart/form-data

{
  superficie: 275.0  // Mettre à jour la superficie
}
```

---

## 📝 Notes importantes

- ⚠️ La colonne `superficie` est **nullable** (peut être NULL)
- 📏 La superficie est en **mètres carrés** (m²)
- 🔄 Si vous exécutez le script plusieurs fois, les bâtiments existants seront ignorés
- 📍 Les coordonnées GPS sont centrées sur **Fianarantsoa, Madagascar**

---

## 🐛 Dépannage

### Erreur : "Column 'superficie' doesn't exist"
- **Solution** : Exécutez d'abord la migration ou le script SQL (Étape 1)

### Erreur : "Bâtiment existe déjà"
- **Solution** : C'est normal, le script ignore les bâtiments existants

### Les coordonnées GPS ne s'affichent pas
- **Vérification** : Vérifiez que les colonnes `latitude` et `longitude` existent dans la table

---

✅ **Script prêt à être utilisé !**

