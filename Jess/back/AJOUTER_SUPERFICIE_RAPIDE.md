# 🔧 Guide Rapide - Ajouter la Colonne Superficie

## ⚠️ Problème

Le champ "Superficie" affiche "Non renseigné" car la colonne `superficie` n'existe pas encore dans la table `mbatiment`.

## ✅ Solution Rapide

### Méthode 1 : Script automatique (Recommandé)

```bash
cd back
node check-and-add-superficie.js
```

Ce script va :
- ✅ Vérifier si la colonne existe
- ✅ L'ajouter automatiquement si elle n'existe pas
- ✅ Afficher des statistiques sur les bâtiments

### Méthode 2 : Migration Sequelize

```bash
cd back
npx sequelize-cli db:migrate
```

### Méthode 3 : SQL manuel (phpMyAdmin)

1. Ouvrez **phpMyAdmin** dans WAMP
2. Sélectionnez votre base de données (`batiment`)
3. Allez dans l'onglet **"SQL"**
4. Copiez et exécutez cette commande :

```sql
ALTER TABLE `mbatiment` 
ADD COLUMN `superficie` DOUBLE NULL 
COMMENT 'Superficie du terrain en mètres carrés'
AFTER `longitude`;
```

## 🔍 Vérification

Après avoir ajouté la colonne, vous pouvez vérifier avec :

```sql
SELECT 
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_COMMENT
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mbatiment'
  AND COLUMN_NAME = 'superficie';
```

## 📝 Mettre à jour les bâtiments existants

Une fois la colonne ajoutée, vous pouvez mettre à jour les bâtiments existants :

```sql
-- Exemple : Mettre à jour le bâtiment 1010 avec une superficie
UPDATE mbatiment 
SET superficie = 350.5 
WHERE numBat = 1010;
```

Ou utilisez le script de création des 7 nouveaux bâtiments qui incluent déjà la superficie :

```bash
cd back
node create-7-batiments-gps.js
```

## ✅ Après l'ajout

Une fois la colonne ajoutée :
1. ✅ Rechargez la page dans le navigateur
2. ✅ La superficie s'affichera pour les bâtiments qui en ont une
3. ✅ Vous pourrez ajouter/modifier la superficie via l'interface admin

---

**💡 Astuce** : Les nouveaux bâtiments créés avec le script `create-7-batiments-gps.js` auront automatiquement une superficie renseignée.

