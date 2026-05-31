# 📋 Guide d'insertion de conventions de test

Ce guide explique comment insérer des données de test pour les conventions afin de tester toutes les fonctionnalités du projet.

## 🚀 Utilisation rapide

### Méthode 1 : Script Node.js (Recommandé)

```bash
cd back
node insert-test-conventions.js
```

Ce script va automatiquement :
- ✅ Vérifier les bâtiments existants (ou en créer si nécessaire)
- ✅ Vérifier/créer les locataires de test
- ✅ Créer des conventions avec des données variées pour tester toutes les fonctionnalités

### Résultat attendu

Le script crée **13 conventions** avec :
- **Différentes années** : 2023, 2024, 2025
- **Différents statuts** : Confirmées et En attente
- **Différentes combinaisons** : Bâtiments et locataires variés

Exemple de sortie :
```
✅ 13 convention(s) créée(s) avec succès !

📊 Statistiques par année:
   2023: 2 convention(s)
   2024: 4 convention(s)
   2025: 7 convention(s)

📊 Statistiques par statut:
   ✅ Confirmées: 10
   ⏳ En attente: 3
```

## 📊 Données créées

### Locataires (10 locataires)
- RAKOTO Jean Marie
- RANDRIA Sophie
- RAHARIJAONA Pierre
- RASOANIRINA Nicole
- ANDRIANASOLO Daniel
- RAJAONAH Hortense
- RAKOTONDRAZAKA Claude
- RAMANANTSOA Elisabeth
- RAZAFIMAHATRATRA Marc
- RASOLOFONJANAHARY Patricia

### Conventions créées

#### Année courante (2025) - 7 conventions
- 5 conventions confirmées
- 2 conventions en attente

#### Année précédente (2024) - 4 conventions
- 3 conventions confirmées
- 1 convention en attente

#### Année -2 (2023) - 2 conventions
- 2 conventions confirmées

## 🎯 Fonctionnalités testables

Avec ces données, vous pouvez tester :

1. **Recherche et filtrage**
   - Recherche par nom de locataire
   - Recherche par CIN
   - Filtrage par statut (confirmé/en attente)
   - Filtrage par année
   - Filtrage par bâtiment

2. **Statistiques**
   - Statistiques par année
   - Statistiques par statut
   - Statistiques par bâtiment

3. **Gestion des conventions**
   - Modification de conventions
   - Changement de statut
   - Association avec des factures

4. **Création de factures**
   - Génération de factures mensuelles
   - Association facture-convention

## ⚙️ Configuration

Le script vérifie automatiquement :
- Si les bâtiments existent (sinon, il en crée 8)
- Si les locataires existent (sinon, il en crée 10)
- Si les conventions existent déjà (évite les doublons)

## 🔄 Réexécution

Le script peut être réexécuté plusieurs fois en toute sécurité :
- Il ne crée pas de doublons
- Il vérifie l'existence avant de créer
- Il affiche un avertissement si une convention existe déjà

## 📝 Notes importantes

- Le champ `lieu` est limité à **10 caractères maximum**
- Le champ `adressecli` est limité à **10 caractères maximum**
- Les dates de délivrance CIN sont limitées à **2007 maximum** (conformément aux règles métier)
- Les conventions sont créées avec `numFact: null` (pas de facture associée au départ)

## 🛠️ Dépannage

### Erreur : "Data too long for column"
- Vérifiez que les champs `lieu` et `adressecli` ne dépassent pas 10 caractères
- Le script a été configuré pour respecter ces limites

### Erreur : "Bâtiment introuvable"
- Le script créera automatiquement des bâtiments si aucun n'existe
- Vérifiez la connexion à la base de données

### Erreur : "Convention existe déjà"
- C'est normal, le script évite les doublons
- Les conventions existantes sont ignorées

## 📚 Fichiers associés

- `insert-test-conventions.js` : Script principal
- `create-test-conventions.js` : Script alternatif (plus simple)
- `insert-conventions.sql` : Script SQL pour phpMyAdmin
- `insert-locataires.sql` : Script SQL pour créer des locataires

## 💡 Prochaines étapes

Après avoir créé les conventions, vous pouvez :
1. Créer des factures pour ces conventions
2. Tester les fonctionnalités de recherche
3. Tester les statistiques
4. Tester les modifications

