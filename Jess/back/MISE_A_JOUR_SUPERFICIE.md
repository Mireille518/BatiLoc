# 📏 Guide - Mise à Jour de la Superficie pour Tous les Bâtiments

## 🎯 Objectif

Ajouter la colonne `superficie` (en m²) à la table `mbatiment` et mettre à jour tous les bâtiments existants avec des valeurs réalistes.

## 🚀 Solution Rapide

### Exécuter le script automatique

```bash
cd back
node update-all-batiments-superficie.js
```

Ce script va :
1. ✅ Vérifier si la colonne `superficie` existe
2. ✅ L'ajouter automatiquement si elle n'existe pas
3. ✅ Mettre à jour **tous les bâtiments** avec une superficie calculée
4. ✅ Conserver les superficies déjà renseignées
5. ✅ Afficher un résumé détaillé

## 📊 Comment la superficie est calculée

Le script calcule une superficie réaliste basée sur le montant du loyer :

- **Formule** : `superficie = 120 + (montant / 2000)`
- **Plage** : Entre 100 m² et 600 m²
- **Exemples** :
  - Bâtiment avec 150 000 Ar → ~195 m²
  - Bâtiment avec 200 000 Ar → ~220 m²
  - Bâtiment avec 300 000 Ar → ~270 m²

## 🔍 Vérification après exécution

### Vérifier que la colonne existe

```sql
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE
FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA = DATABASE()
  AND TABLE_NAME = 'mbatiment'
  AND COLUMN_NAME = 'superficie';
```

### Vérifier les superficies mises à jour

```sql
SELECT 
    numBat,
    adresse,
    montant,
    superficie
FROM mbatiment
ORDER BY numBat;
```

### Statistiques

```sql
SELECT 
    COUNT(*) as total,
    COUNT(superficie) as avec_superficie,
    AVG(superficie) as moyenne_superficie,
    MIN(superficie) as min_superficie,
    MAX(superficie) as max_superficie
FROM mbatiment;
```

## 🔧 Alternative : SQL manuel

Si vous préférez utiliser phpMyAdmin :

### Étape 1 : Ajouter la colonne

```sql
ALTER TABLE `mbatiment` 
ADD COLUMN `superficie` DOUBLE NULL 
COMMENT 'Superficie du terrain en mètres carrés'
AFTER `longitude`;
```

### Étape 2 : Mettre à jour tous les bâtiments

```sql
UPDATE mbatiment 
SET superficie = GREATEST(100, LEAST(600, 120 + (montant / 2000)))
WHERE superficie IS NULL OR superficie = 0;
```

## ✅ Après la mise à jour

1. **Rechargez la page** dans le navigateur
2. **Vérifiez** que la superficie s'affiche dans les modals
3. **Modifiez** les valeurs si nécessaire via l'interface admin

## 📝 Personnaliser les superficies

Si vous voulez modifier manuellement certaines superficies :

```sql
-- Exemple : Mettre à jour le bâtiment 1010 avec 350.5 m²
UPDATE mbatiment 
SET superficie = 350.5 
WHERE numBat = 1010;
```

## 🎯 Résultat attendu

Après l'exécution du script :
- ✅ Tous les bâtiments auront une superficie en m²
- ✅ La superficie sera visible dans les modals de détails
- ✅ La superficie sera visible dans les conventions
- ✅ Vous pourrez modifier les valeurs via l'interface admin

---

**💡 Astuce** : Les nouveaux bâtiments créés via l'interface auront un champ superficie que vous pourrez remplir directement.

