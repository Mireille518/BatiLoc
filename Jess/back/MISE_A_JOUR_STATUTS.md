# 📋 Mise à Jour des Statuts avec Date Madagascar

## 🎯 Objectif

Ce script charge toutes les conventions existantes et applique la nouvelle logique de vérification des statuts basée sur la date Madagascar (UTC+3).

## 🔄 Logique appliquée

1. **Date de référence** : Utilise la date actuelle en heure Madagascar (UTC+3)
2. **Comparaison** : Compare uniquement le **mois/année** du dernier paiement avec le mois/année actuel
3. **Mise à jour** :
   - Si le paiement du mois courant existe → Statut "Confirmé" ✅
   - Si le paiement du mois courant n'existe pas → Statut "En attente" ⏳
   - Si aucun paiement → Statut "En attente" ⏳
4. **Changement d'année** : Géré automatiquement (ex: décembre 2025 → janvier 2026)

## 🚀 Utilisation

### Option 1 : Via le fichier batch (Windows)

```bash
# Double-cliquer sur le fichier ou exécuter :
MISE-A-JOUR-STATUTS.bat
```

### Option 2 : Via Node.js directement

```bash
cd back
node update-statuses-with-madagascar-date.js
```

## 📊 Ce que fait le script

1. ✅ Se connecte à la base de données
2. ✅ Charge toutes les conventions existantes
3. ✅ Pour chaque convention :
   - Trouve la dernière facture payée
   - Compare le mois/année avec le mois/année actuel (Madagascar)
   - Met à jour le statut si nécessaire
4. ✅ Affiche un résumé détaillé des modifications
5. ✅ Valide toutes les modifications en une seule transaction

## 📝 Exemple de sortie

```
╔════════════════════════════════════════════════════════════╗
║   MISE À JOUR DES STATUTS AVEC DATE MADAGASCAR (UTC+3)     ║
╚════════════════════════════════════════════════════════════╝

📅 Date actuelle (Madagascar UTC+3): 2025-01
   Année: 2025, Mois: 01

🔄 Chargement des conventions existantes...
📋 15 convention(s) trouvée(s)

📊 Analyse des statuts:

────────────────────────────────────────────────────────────────
  ✅ Convention #1
     Confirmé → En attente
     Raison: Dernier paiement: 2024-12 ≠ mois actuel (2025-01)

  ✅ Convention #2
     En attente → Confirmé
     Raison: Paiement du mois actuel (2025-01) trouvé

────────────────────────────────────────────────────────────────

📈 Résumé:
   • Conventions vérifiées: 15
   • Statuts mis à jour: 2
   • Aucun changement: 13

✅ Mise à jour terminée avec succès!
```

## ⚠️ Important

- **Transaction sécurisée** : Toutes les modifications sont effectuées dans une transaction
- **Rollback automatique** : En cas d'erreur, toutes les modifications sont annulées
- **Non destructif** : Le script ne supprime aucune donnée, il met uniquement à jour les statuts
- **Idempotent** : Peut être exécuté plusieurs fois sans problème

## 🔄 Après l'exécution

Une fois le script exécuté, les statuts seront automatiquement maintenus à jour :
- ✅ Au démarrage du serveur (vérification automatique)
- ✅ Via l'API `GET /api/factures/check-statuses` (vérification manuelle)
- ✅ Lors de chaque paiement de facture

## 📅 Fuseau horaire

Le script utilise le fuseau horaire **Madagascar (UTC+3 - Africa/Nairobi)** pour toutes les comparaisons de dates, garantissant une cohérence indépendante de la localisation du serveur.

---

**Date de création** : Janvier 2025  
**Version** : 1.0

