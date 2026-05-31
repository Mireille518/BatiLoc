# 📋 Instructions - Création de Données pour Changements de Statut

## 🎯 Objectif

Ce script crée des données de démonstration pour le menu "Changements de statut". Il génère des conventions avec des statuts "Confirmé" alors qu'elles ont dépassé la limite de paiement, permettant de démontrer la fonctionnalité de mise à jour automatique des statuts.

## 📁 Fichiers

- **`create-demo-status-changes.js`** : Script principal
- **`CREER-DONNEES-STATUTS.bat`** : Fichier batch pour exécution facile sur Windows

## 🚀 Utilisation

### Option 1 : Via le fichier batch (Windows)

1. Double-cliquer sur `CREER-DONNEES-STATUTS.bat`
2. Le script s'exécute automatiquement

### Option 2 : Via la ligne de commande

```bash
cd back
node create-demo-status-changes.js
```

## 📊 Données Créées

Le script crée **14 conventions** avec différents scénarios de retard :

- **6 conventions** : Retard de 1 mois (paiement du mois précédent)
- **6 conventions** : Retard de 2 mois (paiement il y a 2 mois)
- **2 conventions** : Retard de 3 mois (paiement il y a 3 mois)

Toutes ces conventions ont un statut **"Confirmé"** alors qu'elles devraient être **"En attente"**, créant une incohérence visible dans le menu "Changements de statut".

## 🎬 Démonstration

### Pour le Rédacteur (peut mettre à jour)

1. Ouvrir l'application web
2. Se connecter en tant que **Rédacteur**
3. Aller dans le menu **"Changements de statut"**
4. Cliquer sur **"Actualiser"**
5. Tu devrais voir **14 conventions** nécessitant une mise à jour
6. Cliquer sur **"Mettre à jour les statuts"**
7. Vérifier que les statuts sont corrigés automatiquement
8. La liste des changements devrait se vider après la mise à jour

### Pour Admin et Caissier (lecture seule)

1. Se connecter en tant qu'**Admin** ou **Caissier**
2. Aller dans le menu **"Changements de statut"**
3. Cliquer sur **"Actualiser"**
4. Tu devrais voir **14 conventions** nécessitant une mise à jour
5. **Mais tu ne peux PAS** cliquer sur "Mettre à jour les statuts" (lecture seule)
6. Un message indique : "Mode lecture seule - Seul le Rédacteur peut mettre à jour les statuts"

## 🔄 Réinitialisation

Pour refaire la démonstration, tu peux :

1. Exécuter à nouveau `create-demo-status-changes.js`
2. Ou utiliser `reset-demo-statuses.js` pour réinitialiser les données existantes

## ⚠️ Notes Importantes

- Le script utilise la **date Madagascar (UTC+3)** pour tous les calculs
- Les données sont créées à partir des conventions existantes
- Le script gère automatiquement le changement d'année
- Les factures sont créées ou mises à jour selon les besoins
- Toutes les opérations sont effectuées dans une transaction pour garantir la cohérence

## 📝 Exemple de Sortie

```
📊 RÉSUMÉ DES DONNÉES CRÉÉES:

   • 14 convention(s) modifiée(s)
   • 14 convention(s) en retard (statut incorrect: Confirmé → devrait être En attente)

📝 DÉTAILS DES CONVENTIONS MODIFIÉES:

   1. Convention #115 - BOMBASS
      Statut actuel: Confirmé ❌
      Statut attendu: En attente ✅
      Dernier paiement: 2025-11
      Retard 1 mois - Statut: Confirmé (devrait être En attente)
   
   ...
```

## ✅ Vérification

Après avoir exécuté le script, tu peux vérifier que les données sont bien créées en :

1. Allant dans le menu "Changements de statut"
2. Cliquant sur "Actualiser"
3. Vérifiant que les 14 conventions apparaissent avec un statut "Confirmé" alors qu'elles devraient être "En attente"

---

**Date de création** : Décembre 2025  
**Auteur** : Système de gestion de conventions

