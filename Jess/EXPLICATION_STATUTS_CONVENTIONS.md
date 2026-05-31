# 📋 Explication des Statuts des Conventions

## 🎯 Vue d'ensemble

Les conventions ont **deux statuts possibles** qui indiquent leur état dans le système :

### ✅ **"Confirmé"** (statutConv = true)
- **Signification** : La convention est **active et validée**
- **Condition** : Au moins **une facture** de cette convention a été **payée**
- **Couleur** : Badge **vert** (#dcfce7 avec texte #166534)
- **Signification métier** : Le locataire a commencé à payer, la convention est donc confirmée et active

### ⏳ **"En attente"** (statutConv = false)
- **Signification** : La convention est **en attente de confirmation**
- **Condition** : **Toutes les factures** de cette convention sont **impayées** OU **aucune facture n'existe encore**
- **Couleur** : Badge **jaune/orange** (#fef3c7 avec texte #92400e)
- **Signification métier** : Le locataire n'a pas encore effectué de paiement, la convention attend d'être confirmée

---

## 🔄 Comment ça fonctionne ?

### 1. **Création d'une convention**
```
Nouvelle convention créée
    ↓
statutConv = false (En attente) par défaut
    ↓
Aucune facture n'existe encore
```

### 2. **Création d'une facture**
```
Facture créée pour la convention
    ↓
statutPaiement = false (Non payée) par défaut
    ↓
La convention reste "En attente"
```

### 3. **Paiement d'une facture**
```
Facture marquée comme payée
    ↓
statutPaiement = true
    ↓
Mise à jour automatique → statutConv = true (Confirmé) ✅
    ↓
La convention devient "Confirmé"
```

---

## 📊 Règles de mise à jour automatique

### Règle principale
- **Si au moins 1 facture est payée** → Convention devient **"Confirmé"** ✅
- **Si toutes les factures sont impayées** → Convention reste **"En attente"** ⏳
- **Si aucune facture n'existe** → Convention reste **"En attente"** ⏳

### Mise à jour automatique
Le statut est mis à jour **automatiquement** quand :
1. ✅ Une facture est marquée comme payée via le formulaire de paiement
2. ✅ Une facture est marquée comme payée directement depuis la liste
3. ✅ Un paiement est enregistré dans le système

---

## 🎨 Affichage dans l'interface

### Dans le tableau des conventions

| Statut | Badge | Couleur | Signification |
|--------|-------|---------|---------------|
| **Confirmé** | ✅ Vert | Fond vert clair, texte vert foncé | Convention active |
| **En attente** | ⏳ Jaune | Fond jaune clair, texte orange | Convention en attente |

### Exemple visuel
```
┌─────────────────────────────────────┐
│ Convention #17                       │
│ Statut: [Confirmé] ← Badge vert     │
│ Locataire: RAKOTO Jean Marie        │
│ Loyer: 150000 Ar                     │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Convention #20                       │
│ Statut: [En attente] ← Badge jaune  │
│ Locataire: RASOANIRINA Nicole        │
│ Loyer: 250000 Ar                     │
└─────────────────────────────────────┘
```

---

## 💡 Exemples concrets

### Exemple 1 : Convention confirmée
```
1. Convention créée → "En attente"
2. Facture de janvier créée → Toujours "En attente"
3. Facture de janvier payée → "Confirmé" ✅
4. Facture de février créée → Reste "Confirmé" (car janvier est payée)
```

### Exemple 2 : Convention en attente
```
1. Convention créée → "En attente"
2. Facture de janvier créée → Toujours "En attente"
3. Facture de février créée → Toujours "En attente"
4. Aucune facture payée → Reste "En attente" ⏳
```

### Exemple 3 : Convention avec plusieurs factures
```
1. Convention créée → "En attente"
2. Factures de janvier, février, mars créées → "En attente"
3. Facture de janvier payée → "Confirmé" ✅
4. Même si février et mars ne sont pas payées, la convention reste "Confirmé"
```

---

## 🔍 Où voir les statuts ?

### 1. **Tableau des conventions** (AdminDash)
- Colonne "STATUT" avec badge coloré
- Filtrage possible par statut

### 2. **Statistiques** (Dashboard)
- Carte "Conventions confirmées" : Nombre de conventions confirmées
- Carte "En attente" : Nombre de conventions en attente

### 3. **Liste des conventions** (Redacteur)
- Affichage du statut pour chaque convention
- Statistiques par période

---

## ⚙️ Modifications manuelles

### Peut-on changer le statut manuellement ?
- **Non**, le statut est mis à jour **automatiquement** en fonction des paiements
- Pour changer le statut, il faut :
  - Soit payer une facture (pour passer à "Confirmé")
  - Soit annuler tous les paiements (pour revenir à "En attente")

### Pourquoi cette logique ?
- **Cohérence** : Le statut reflète toujours l'état réel des paiements
- **Fiabilité** : Pas de risque d'erreur manuelle
- **Automatisation** : Le système gère tout automatiquement

---

## 📝 Résumé rapide

| Question | Réponse |
|----------|---------|
| **Qu'est-ce que "Confirmé" ?** | Convention active, au moins une facture payée |
| **Qu'est-ce que "En attente" ?** | Convention en attente, aucune facture payée |
| **Comment passer à "Confirmé" ?** | Payer au moins une facture |
| **Comment passer à "En attente" ?** | Annuler tous les paiements |
| **Le statut change-t-il automatiquement ?** | Oui, en fonction des paiements |
| **Où voir le statut ?** | Tableau des conventions, statistiques |

---

**💡 Astuce** : Pour voir rapidement quelles conventions sont actives, filtrez par statut "Confirmé" dans le tableau des conventions.

