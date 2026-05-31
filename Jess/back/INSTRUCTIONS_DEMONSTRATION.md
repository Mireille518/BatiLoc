# 🎬 Instructions pour la Démonstration - Changement de Statut

## 📋 Vue d'ensemble

Ce document explique comment préparer et effectuer la démonstration du système de mise à jour automatique des statuts des conventions pour votre mémoire.

## 🔄 Réinitialiser les données pour la démonstration

Avant chaque démonstration, tu dois réinitialiser les statuts pour qu'ils nécessitent une mise à jour.

### Option 1 : Via le fichier batch (Windows)

```bash
# Double-cliquer sur :
REINITIALISER-DEMO.bat
```

### Option 2 : Via Node.js directement

```bash
cd back
node reset-demo-statuses.js
```

## 📊 Ce que fait le script

Le script `reset-demo-statuses.js` :

1. **Récupère les conventions existantes** (jusqu'à 20)
2. **Modifie leurs statuts** pour créer des incohérences :
   - Met "Confirmé" sur des conventions qui devraient être "En attente" (retard de paiement)
   - Met "En attente" sur des conventions qui devraient être "Confirmé" (paiement à jour)
3. **Crée ou modifie les factures** pour simuler différents scénarios :
   - Paiement du mois précédent (retard 1 mois)
   - Paiement de 2 mois en arrière (retard 2 mois)
   - Paiement de 3 mois en arrière (retard 3 mois)
   - Facture non payée du mois actuel

## 🎯 Scénarios créés

Après l'exécution du script, tu auras :

- **3 conventions** avec retard de 1 mois (statut incorrect : Confirmé)
- **3 conventions** avec retard de 2 mois (statut incorrect : Confirmé)
- **2 conventions** avec retard de 3 mois (statut incorrect : Confirmé)
- **2 conventions** sans paiement (statut incorrect : Confirmé)

**Total : 10 conventions nécessitant une mise à jour**

## 🚀 Étapes de la démonstration

### Étape 1 : Préparation (avant la démonstration)

1. Exécuter le script de réinitialisation :
   ```bash
   node reset-demo-statuses.js
   ```

2. Vérifier que le serveur backend est démarré

3. Vérifier que l'application frontend est accessible

### Étape 2 : Démonstration

1. **Ouvrir l'application web** dans le navigateur

2. **Se connecter** avec un compte ayant les permissions nécessaires

3. **Aller dans la section "Changements de statut"**
   - Menu latéral → "Changements de statut"

4. **Cliquer sur "Actualiser"** pour charger les données
   - Tu devrais voir **10 conventions** nécessitant une mise à jour
   - Les cartes de résumé affichent :
     - Mois actuel : 2025-12 (ou le mois actuel)
     - À mettre à jour : 10
     - Statuts corrects : X
     - Total conventions : Y

5. **Expliquer le problème** :
   - "Voici 10 conventions avec des statuts incorrects"
   - "Elles sont marquées 'Confirmé' alors qu'elles devraient être 'En attente'"
   - "Leur dernier paiement date d'un mois précédent ou n'existe pas"

6. **Cliquer sur "Mettre à jour les statuts"**
   - Le système va automatiquement :
     - Vérifier chaque convention
     - Comparer le dernier paiement avec le mois actuel
     - Corriger les statuts incorrects
   - Un message de succès s'affiche : "✅ X statut(s) mis à jour avec succès !"

7. **Vérifier les résultats** :
   - La liste des conventions à mettre à jour se vide automatiquement
   - Un message vert apparaît : "✅ Tous les statuts sont à jour !"
   - Aller dans "Conventions" pour voir les statuts corrigés

8. **Montrer la cohérence** :
   - Cliquer sur "Actualiser" dans "Changements de statut"
   - Les statuts restent corrects (pas de régression)
   - Expliquer que le système utilise la date Madagascar (UTC+3) pour toutes les comparaisons

## 🔍 Points clés à expliquer

1. **Automatisation** : Le système détecte et corrige automatiquement les incohérences
2. **Date Madagascar** : Toutes les comparaisons utilisent la date Madagascar (UTC+3), pas la date locale
3. **Comparaison mois/année** : Le système compare uniquement le mois et l'année, pas les jours
4. **Gestion du changement d'année** : Le système gère correctement le passage d'une année à l'autre
5. **Persistance** : Les changements sont sauvegardés en base de données et visibles partout

## 📝 Scripts disponibles

| Script | Description | Utilisation |
|--------|-------------|-------------|
| `reset-demo-statuses.js` | Réinitialise les statuts pour la démo | Avant chaque démonstration |
| `reset-and-create-status-data.js` | Crée de nouvelles données de test | Pour tester avec de nouvelles conventions |
| `create-demo-data-from-existing.js` | Modifie les conventions existantes | Pour créer des données de démo à partir de données réelles |

## ⚠️ Important

- **Toujours réinitialiser avant une démonstration** pour avoir des données à mettre à jour
- Le script utilise les **conventions existantes** (pas de nouvelles créations)
- Les modifications sont **réversibles** (tu peux réinitialiser autant de fois que nécessaire)
- Le système fonctionne avec la **date actuelle** (Madagascar UTC+3)

## 🎓 Pour les jurés

Lors de la présentation, tu peux expliquer :

1. **Le problème** : Comment les statuts peuvent devenir incorrects au fil du temps
2. **La solution** : Le système automatique de détection et correction
3. **La démonstration** : Montrer le processus en temps réel
4. **Les résultats** : Vérifier que les corrections sont appliquées et persistantes

---

**Date de création** : Décembre 2025  
**Version** : 1.0

