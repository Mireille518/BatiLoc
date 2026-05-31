# 📊 Instructions pour Créer des Données de Test

## 🎯 Objectif

Ce script crée des données de test pour tester la fonctionnalité de mise à jour automatique des statuts basée sur la date Madagascar (UTC+3).

## 🚀 Utilisation

### Option 1 : Via le fichier batch (Windows)

```bash
# Double-cliquer sur le fichier ou exécuter :
CREER-DONNEES-TEST.bat
```

### Option 2 : Via Node.js directement

```bash
cd back
node create-test-data-status-update.js
```

## 📋 Scénarios créés

Le script crée **5 conventions de test** avec différents scénarios :

### Scénario 1 : Paiement du mois actuel ✅
- **Convention** : Statut initial "En attente"
- **Facture** : Mois actuel, **PAYÉE**
- **Résultat attendu** : Statut → **"Confirmé"** ✅

### Scénario 2 : Paiement du mois précédent ⏳
- **Convention** : Statut initial "Confirmé"
- **Facture** : Mois précédent, **PAYÉE**
- **Résultat attendu** : Statut → **"En attente"** ⏳
- **Raison** : Le paiement n'est pas du mois actuel

### Scénario 3 : Aucun paiement ⏳
- **Convention** : Statut initial "Confirmé"
- **Facture** : Mois actuel, **NON PAYÉE**
- **Résultat attendu** : Statut → **"En attente"** ⏳
- **Raison** : Aucun paiement trouvé

### Scénario 4 : Facture non payée ⏳
- **Convention** : Statut initial "En attente"
- **Facture** : Mois actuel, **NON PAYÉE**
- **Résultat attendu** : Statut reste **"En attente"** ⏳

### Scénario 5 : Paiement actuel mais statut incorrect ✅
- **Convention** : Statut initial "En attente" (incorrect)
- **Facture** : Mois actuel, **PAYÉE**
- **Résultat attendu** : Statut → **"Confirmé"** ✅
- **Raison** : Correction du statut incorrect

## 🔄 Après la création

Une fois les données créées, tu peux :

### 1. Vérifier dans l'interface web
- Aller dans la section **"Changements de statut"**
- Voir les conventions qui nécessitent une mise à jour
- Cliquer sur **"Mettre à jour les statuts"**

### 2. Utiliser le script de mise à jour
```bash
node update-statuses-with-madagascar-date.js
```

### 3. Vérifier les résultats
- Les statuts devraient être mis à jour selon la logique :
  - ✅ Paiement du mois actuel → "Confirmé"
  - ⏳ Pas de paiement du mois actuel → "En attente"

## 📅 Date de référence

Le script utilise la **date Madagascar (UTC+3)** pour :
- Déterminer le mois actuel
- Créer les factures avec les bons mois
- Comparer les paiements

## ⚠️ Important

- Le script nécessite au moins **5 bâtiments** et **5 locataires** existants
- Les données sont créées dans une **transaction** (tout ou rien)
- Les conventions sont créées avec des statuts initiaux différents pour tester tous les cas

## 🧹 Nettoyage (optionnel)

Si tu veux supprimer les données de test :

```sql
-- Supprimer les factures de test (remplacer les numConv par ceux créés)
DELETE FROM facture WHERE numConv IN (SELECT numConv FROM convention WHERE dateConv = '2025-01-01' LIMIT 5);

-- Supprimer les conventions de test
DELETE FROM convention WHERE dateConv = '2025-01-01' LIMIT 5;
```

---

**Date de création** : Janvier 2025  
**Version** : 1.0

