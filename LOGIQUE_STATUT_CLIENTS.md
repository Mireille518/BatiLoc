# 📋 Logique de Mise à Jour Automatique du Statut des Clients

## 🎯 Vue d'ensemble

Le statut des clients (affiché comme "Confirmé" ou "En attente") est maintenant **mis à jour automatiquement** en fonction des paiements des factures.

## 🔄 Comment ça fonctionne

### 1. Structure des données

- **Table `locataire`** : Pas de champ statut direct
- **Table `convention`** : Champ `statutConv` (boolean)
  - `true` = "Confirmé" ✅
  - `false` = "En attente" ⏳
- **Table `facture`** : Nouveau champ `statutPaiement` (boolean)
  - `true` = Facture payée
  - `false` = Facture en attente (par défaut)

### 2. Logique de mise à jour automatique

**Règle principale** : 
- Si **au moins une facture** de la convention est payée → `statutConv = true` (Confirmé)
- Si **toutes les factures** sont impayées → `statutConv = false` (En attente)

### 3. Déclenchement automatique

La mise à jour se fait automatiquement quand :
1. ✅ Une facture est marquée comme payée via l'API `PUT /factures/:numFact`
2. ✅ Un paiement est enregistré via le formulaire de paiement
3. ✅ Une facture est marquée comme payée directement depuis la liste

## 📝 Modifications apportées

### Backend

#### 1. Modèle `facture.js`
- ✅ Ajout du champ `statutPaiement` (BOOLEAN, défaut: false)

#### 2. Migration
- ✅ Fichier : `back/migrations/20250120000000-add-statut-paiement-facture.js`
- ✅ Ajoute la colonne `statutPaiement` à la table `facture`

#### 3. API `facture.js`
- ✅ Fonction `updateConventionStatus(numConv)` : Met à jour automatiquement le statut de la convention
- ✅ Route `PUT /factures/:numFact` : Accepte `statutPaiement` et déclenche la mise à jour
- ✅ Route `POST /factures` : Crée les factures avec `statutPaiement = false` par défaut
- ✅ Route `GET /factures/stats/summary` : Utilise `statutPaiement` pour les statistiques

### Frontend

#### 1. `CaisseDash.jsx`
- ✅ Fonction `handleCreatePayment()` : Met à jour le statut de paiement lors de l'enregistrement
- ✅ Fonction `handleMarkAsPaid(facture)` : Permet de marquer une facture comme payée directement
- ✅ Colonne "STATUT" ajoutée dans le tableau des factures
- ✅ Badge visuel (vert = Payée, jaune = En attente)
- ✅ Bouton "Payée" pour marquer rapidement une facture comme payée

## 🚀 Utilisation

### Pour marquer une facture comme payée :

**Option 1 : Via le formulaire de paiement**
1. Cliquer sur "Enregistrer un paiement"
2. Remplir les informations (N° facture, montant, date, méthode)
3. Le statut de la facture ET de la convention sont mis à jour automatiquement

**Option 2 : Directement depuis la liste**
1. Dans le tableau des factures, cliquer sur le bouton "Payée" (vert)
2. Confirmer l'action
3. Le statut est mis à jour automatiquement

### Résultat visuel

- **Convention "Confirmé"** (vert) : Au moins une facture est payée
- **Convention "En attente"** (jaune) : Toutes les factures sont impayées

## ⚙️ Migration de la base de données

Pour appliquer les changements à la base de données existante :

```bash
# Exécuter la migration
npx sequelize-cli db:migrate
```

Ou manuellement en SQL :
```sql
ALTER TABLE facture 
ADD COLUMN statutPaiement BOOLEAN NOT NULL DEFAULT FALSE;
```

## 🔍 Points importants

1. **Mise à jour asynchrone** : La mise à jour du statut de convention se fait en arrière-plan pour ne pas bloquer la réponse API
2. **Pas de rétroaction** : Si une facture est "démarquée" comme non payée, le statut de la convention reste "Confirmé" (logique : une fois confirmé, ça reste confirmé)
3. **Performance** : La fonction `updateConventionStatus` vérifie toutes les factures de la convention à chaque paiement

## 📊 Exemple de flux

```
1. Création d'une convention → statutConv = false (En attente)
2. Création d'une facture → statutPaiement = false
3. Paiement de la facture → statutPaiement = true
4. → Mise à jour automatique → statutConv = true (Confirmé) ✅
5. Le client apparaît maintenant comme "Confirmé" dans l'interface
```

## 🎨 Interface utilisateur

- **Tableau des factures** : Colonne "STATUT" avec badge coloré
- **Tableau des conventions** : Colonne "STATUT" mise à jour automatiquement
- **Bouton "Payée"** : Visible uniquement pour les factures non payées

---

**Date d'implémentation** : 20 janvier 2025
**Version** : 1.0

