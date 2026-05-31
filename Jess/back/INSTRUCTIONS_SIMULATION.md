# 🎬 Instructions pour la Simulation de Retard de Paiement

## 🎯 Objectif

Ce script crée une simulation avec des clients en retard de paiement pour voir les changements de statut en action.

## 🚀 Utilisation

### Option 1 : Via le fichier batch (Windows)

```bash
# Double-cliquer sur :
CREER-SIMULATION-RETARD.bat
```

### Option 2 : Via Node.js directement

```bash
cd back
node create-simulation-retard.js
```

## 📊 Scénarios créés

Le script crée **5 scénarios de simulation** :

### 🔴 SCÉNARIO 1 : Client en retard de 1 mois
- **Dernier paiement** : Mois précédent (ex: Décembre 2024)
- **Statut actuel** : Confirmé (incorrect)
- **Statut attendu** : En attente ⏳
- **Raison** : Paiement dépassé de 1 mois

### 🔴 SCÉNARIO 2 : Client en retard de 2 mois
- **Dernier paiement** : Il y a 2 mois (ex: Novembre 2024)
- **Statut actuel** : Confirmé (incorrect)
- **Statut attendu** : En attente ⏳
- **Raison** : Paiement dépassé de 2 mois

### 🔴 SCÉNARIO 3 : Client en retard de 3 mois
- **Dernier paiement** : Il y a 3 mois (ex: Octobre 2024)
- **Statut actuel** : Confirmé (incorrect)
- **Statut attendu** : En attente ⏳
- **Raison** : Paiement dépassé de 3 mois

### 🔴 SCÉNARIO 4 : Client sans aucun paiement
- **Dernier paiement** : Aucun
- **Statut actuel** : Confirmé (incorrect)
- **Statut attendu** : En attente ⏳
- **Raison** : Aucun paiement trouvé

### 🟢 SCÉNARIO 5 : Client à jour
- **Dernier paiement** : Mois actuel (ex: Janvier 2025)
- **Statut actuel** : En attente (incorrect)
- **Statut attendu** : Confirmé ✅
- **Raison** : Paiement du mois actuel trouvé

## 📋 Résultat attendu

Après la synchronisation, tu devrais voir :

### Clients en retard (4) → "En attente" ⏳
1. Convention #X - Client avec retard de 1 mois
2. Convention #Y - Client avec retard de 2 mois
3. Convention #Z - Client avec retard de 3 mois
4. Convention #W - Client sans paiement

### Clients à jour (1) → "Confirmé" ✅
1. Convention #V - Client avec paiement du mois actuel

## 🔄 Comment voir les changements

### Étape 1 : Créer la simulation
```bash
node create-simulation-retard.js
```

### Étape 2 : Ouvrir l'application web
1. Aller dans la section **"Changements de statut"**
2. Tu verras **4 clients en retard** qui nécessitent une mise à jour
3. Tu verras **1 client à jour** qui devrait être Confirmé

### Étape 3 : Synchroniser les statuts
**Option A : Via l'interface web**
- Cliquer sur **"Mettre à jour les statuts"**
- Voir les changements en temps réel

**Option B : Via le script**
```bash
node sync-statuses-automatic.js
```

### Étape 4 : Vérifier les résultats
Dans la section "Changements de statut", tu devrais voir :
- ✅ 4 conventions mises à jour : Confirmé → En attente
- ✅ 1 convention mise à jour : En attente → Confirmé

## 📅 Exemple concret

Si nous sommes en **Janvier 2025** :

### Avant la synchronisation :
```
Convention #1 - Client A
  Dernier paiement: Décembre 2024 (PAYÉ)
  Statut: Confirmé ✅

Convention #2 - Client B
  Dernier paiement: Novembre 2024 (PAYÉ)
  Statut: Confirmé ✅

Convention #3 - Client C
  Dernier paiement: Octobre 2024 (PAYÉ)
  Statut: Confirmé ✅

Convention #4 - Client D
  Dernier paiement: Aucun
  Statut: Confirmé ✅

Convention #5 - Client E
  Dernier paiement: Janvier 2025 (PAYÉ)
  Statut: En attente ⏳
```

### Après la synchronisation :
```
Convention #1 - Client A
  Dernier paiement: Décembre 2024 (PAYÉ)
  Statut: En attente ⏳ (RETARD DE 1 MOIS)

Convention #2 - Client B
  Dernier paiement: Novembre 2024 (PAYÉ)
  Statut: En attente ⏳ (RETARD DE 2 MOIS)

Convention #3 - Client C
  Dernier paiement: Octobre 2024 (PAYÉ)
  Statut: En attente ⏳ (RETARD DE 3 MOIS)

Convention #4 - Client D
  Dernier paiement: Aucun
  Statut: En attente ⏳ (AUCUN PAIEMENT)

Convention #5 - Client E
  Dernier paiement: Janvier 2025 (PAYÉ)
  Statut: Confirmé ✅ (À JOUR)
```

## 💡 Points importants

- ✅ Les données utilisent la **date Madagascar (UTC+3)**
- ✅ Le système calcule automatiquement les mois précédents
- ✅ Les statuts sont mis à jour selon la logique :
  - Paiement du mois actuel → "Confirmé"
  - Paiement dépassé → "En attente"
  - Aucun paiement → "En attente"

## 🧹 Nettoyage (optionnel)

Si tu veux supprimer les données de simulation :

```sql
-- Trouver les conventions de simulation (remplacer par les numConv créés)
SELECT numConv FROM convention WHERE dateConv = '2025-01-01' ORDER BY numConv DESC LIMIT 5;

-- Supprimer les factures
DELETE FROM facture WHERE numConv IN (SELECT numConv FROM convention WHERE dateConv = '2025-01-01' ORDER BY numConv DESC LIMIT 5);

-- Supprimer les conventions
DELETE FROM convention WHERE dateConv = '2025-01-01' ORDER BY numConv DESC LIMIT 5;
```

---

**Date de création** : Janvier 2025  
**Version** : 1.0

