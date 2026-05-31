# 🔄 Instructions de Synchronisation Automatique des Statuts

## 🎯 Objectif

Ce système synchronise automatiquement les statuts des conventions en fonction des paiements mensuels, en utilisant la date Madagascar (UTC+3).

## 🚀 Fonctionnalités

### 1. Synchronisation automatique au démarrage
- ✅ Vérifie et met à jour les statuts au démarrage du serveur
- ✅ Utilise la date Madagascar (UTC+3) pour toutes les comparaisons
- ✅ Identifie les clients qui ont dépassé le mois de leur paiement

### 2. Synchronisation périodique
- ✅ Vérifie et met à jour les statuts toutes les heures
- ✅ Détecte automatiquement les changements de mois
- ✅ Met à jour les statuts sans intervention manuelle

### 3. Script de synchronisation manuelle
- ✅ Modifie les données existantes pour créer des cas de test
- ✅ Synchronise tous les statuts en une seule fois
- ✅ Affiche un rapport détaillé des modifications

## 📋 Utilisation

### Option 1 : Synchronisation automatique (recommandé)

La synchronisation se fait **automatiquement** :
- ✅ Au démarrage du serveur
- ✅ Toutes les heures pendant que le serveur tourne

**Aucune action requise** - le système gère tout automatiquement !

### Option 2 : Synchronisation manuelle

Si tu veux forcer une synchronisation immédiate :

#### Via le fichier batch (Windows)
```bash
# Double-cliquer sur :
SYNCHRONISER-STATUTS.bat
```

#### Via Node.js
```bash
cd back
node sync-statuses-automatic.js
```

## 🔄 Ce que fait la synchronisation

### Étape 1 : Modification des données existantes
Le script modifie les conventions existantes pour créer différents scénarios :

1. **Facture du mois précédent payée** → Statut devrait être "En attente"
2. **Facture du mois actuel non payée** → Statut devrait être "En attente"
3. **Toutes factures non payées** → Statut devrait être "En attente"
4. **Facture du mois actuel payée** → Statut devrait être "Confirmé"
5. **Facture du mois précédent payée** → Statut devrait être "En attente"

### Étape 2 : Synchronisation des statuts
Pour chaque convention, le système :

1. ✅ Trouve la dernière facture payée
2. ✅ Compare le mois/année avec le mois/année actuel (Madagascar)
3. ✅ Met à jour le statut si nécessaire :
   - **Paiement du mois actuel** → "Confirmé" ✅
   - **Paiement dépassé ou aucun paiement** → "En attente" ⏳

## 📊 Exemples de synchronisation

### Exemple 1 : Client avec paiement dépassé
```
Avant :
- Dernier paiement : Décembre 2024
- Statut actuel : Confirmé
- Mois actuel : Janvier 2025

Après synchronisation :
- Statut mis à jour : En attente ⏳
- Raison : Dernier paiement (2024-12) ≠ mois actuel (2025-01)
```

### Exemple 2 : Client avec paiement du mois actuel
```
Avant :
- Dernier paiement : Janvier 2025
- Statut actuel : En attente
- Mois actuel : Janvier 2025

Après synchronisation :
- Statut mis à jour : Confirmé ✅
- Raison : Paiement du mois actuel trouvé
```

### Exemple 3 : Client sans paiement
```
Avant :
- Aucun paiement
- Statut actuel : Confirmé

Après synchronisation :
- Statut mis à jour : En attente ⏳
- Raison : Aucun paiement trouvé
```

## ⚙️ Configuration

### Synchronisation automatique dans `index.js`

La synchronisation est configurée pour :
- ✅ S'exécuter 2 secondes après le démarrage du serveur
- ✅ S'exécuter toutes les heures (3600000 ms)
- ✅ Ne pas bloquer le démarrage en cas d'erreur

### Personnaliser la fréquence

Pour changer la fréquence de synchronisation, modifie dans `back/index.js` :

```javascript
// Synchronisation toutes les heures (par défaut)
setInterval(async () => {
  // ...
}, 60 * 60 * 1000); // 3600000 ms = 1 heure

// Pour synchroniser toutes les 30 minutes :
setInterval(async () => {
  // ...
}, 30 * 60 * 1000); // 1800000 ms = 30 minutes
```

## 📅 Date de référence

Le système utilise **uniquement la date Madagascar (UTC+3)** :
- ✅ Indépendant de la date du poste client
- ✅ Gère automatiquement le changement d'année
- ✅ Compare uniquement mois/année (pas les jours)

## 🔍 Vérification

### Dans l'interface web
1. Aller dans la section **"Changements de statut"**
2. Voir les conventions qui nécessitent une mise à jour
3. Les statuts sont mis à jour automatiquement

### Dans les logs du serveur
```
🔄 Synchronisation automatique des statuts au démarrage...
📅 Mois/année actuel (Madagascar UTC+3): 2025-01
📋 Nombre de conventions à vérifier: 15
✅ Vérification terminée: 15 conventions vérifiées, 3 statuts mis à jour
✅ Synchronisation automatique terminée
```

## ⚠️ Important

- **Transaction sécurisée** : Toutes les modifications sont dans une transaction
- **Rollback automatique** : En cas d'erreur, tout est annulé
- **Non destructif** : Aucune suppression, uniquement des mises à jour de statuts
- **Idempotent** : Peut être exécuté plusieurs fois sans problème

## 🎯 Résultat

Après la synchronisation :
- ✅ Tous les clients avec paiement du mois actuel sont "Confirmé"
- ✅ Tous les clients avec paiement dépassé sont "En attente"
- ✅ Les statuts sont synchronisés avec la date Madagascar
- ✅ Le système détecte automatiquement les changements de mois

---

**Date de création** : Janvier 2025  
**Version** : 1.0

