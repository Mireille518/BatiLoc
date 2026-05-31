# 📅 Logique de Paiement Mensuel

## 🎯 Vue d'ensemble

Le système de paiement fonctionne selon une logique mensuelle où chaque paiement couvre la période du jour du paiement jusqu'à la fin du mois, et une nouvelle facture est automatiquement générée au début de chaque mois.

## 🔄 Comment ça fonctionne

### 1. Logique de période

**Règle principale** :
- Si un client paie le **22 novembre 2025**, le paiement couvre la période du **22 novembre au 30 novembre 2025**
- Le **1er décembre 2025**, une nouvelle facture est automatiquement créée pour décembre (du 1er au 31 décembre)
- Si le client paie le **15 décembre**, cela couvre du **15 décembre au 31 décembre**
- Et ainsi de suite chaque mois

### 2. Structure des données

**Nouveaux champs dans la table `facture`** :
- `dateDebut` : Date de début de la période couverte (DATEONLY)
- `dateFin` : Date de fin de la période couverte (DATEONLY)
- `datePaiement` : Date effective du paiement (DATEONLY)

### 3. Calcul automatique de la période

Quand un paiement est enregistré :
1. La `datePaiement` est enregistrée (date choisie par l'utilisateur ou aujourd'hui)
2. La `dateDebut` = date du paiement
3. La `dateFin` = dernier jour du mois du paiement

**Exemple** :
- Paiement le 22/11/2025
- `dateDebut` = 2025-11-22
- `dateFin` = 2025-11-30 (dernier jour de novembre)

## 📝 Modifications apportées

### Backend

#### 1. Modèle `facture.js`
- ✅ Ajout des champs `dateDebut`, `dateFin`, `datePaiement`

#### 2. Migration
- ✅ Fichier : `back/migrations/20250122000000-add-periodes-facture.js`
- ✅ Ajoute les colonnes pour stocker les périodes

#### 3. API `facture.js`
- ✅ Fonction `calculatePaymentPeriod(datePaiement)` : Calcule automatiquement la période
- ✅ Route `PUT /factures/:numFact` : Calcule et enregistre la période lors du paiement
- ✅ Route `POST /factures` : Crée les factures avec période du 1er au dernier jour du mois
- ✅ Fonction `generateMonthlyInvoices()` : Génère automatiquement les factures au début de chaque mois
- ✅ Route `POST /factures/generate-monthly` : Endpoint pour déclencher la génération mensuelle

### Frontend

#### 1. `CaisseDash.jsx`
- ✅ Envoie la `datePaiement` lors de l'enregistrement d'un paiement
- ✅ Affiche la période couverte dans le tableau des factures
- ✅ Affiche la période et la date de paiement dans le modal de détails

## 🚀 Utilisation

### Enregistrer un paiement

1. Cliquer sur "Enregistrer un paiement"
2. Sélectionner la facture
3. La date de paiement est pré-remplie avec aujourd'hui (modifiable)
4. Le système calcule automatiquement :
   - Période couverte : du jour du paiement à la fin du mois
   - Statut de la convention mis à jour automatiquement

### Génération automatique des factures

**Option 1 : Automatique (recommandé)**
- Configurer un cron job pour appeler `POST /factures/generate-monthly` le 1er de chaque mois
- Ou utiliser une tâche planifiée dans votre système

**Option 2 : Manuelle**
- Un administrateur peut appeler l'endpoint `POST /factures/generate-monthly` pour générer les factures du mois en cours

### Affichage dans l'interface

- **Tableau des factures** : Colonne "PÉRIODE" affiche "du XX/XX au XX/XX"
- **Modal de détails** : Affiche la période complète et la date de paiement
- **Tableau des paiements** : Affiche la période couverte par chaque paiement

## 📊 Exemple de flux complet

```
1. 1er novembre 2025 → Facture créée automatiquement (période: 01/11 au 30/11)
2. 22 novembre 2025 → Client paie → Période: 22/11 au 30/11
3. 1er décembre 2025 → Nouvelle facture créée automatiquement (période: 01/12 au 31/12)
4. 15 décembre 2025 → Client paie → Période: 15/12 au 31/12
5. 1er janvier 2026 → Nouvelle facture créée automatiquement (période: 01/01 au 31/01)
```

## ⚙️ Migration de la base de données

Pour appliquer les changements à la base de données existante :

```bash
# Exécuter la migration
npx sequelize-cli db:migrate
```

Ou manuellement en SQL :
```sql
ALTER TABLE facture 
ADD COLUMN dateDebut DATE NULL COMMENT 'Date de début de la période couverte par le paiement',
ADD COLUMN dateFin DATE NULL COMMENT 'Date de fin de la période couverte par le paiement',
ADD COLUMN datePaiement DATE NULL COMMENT 'Date effective du paiement';
```

## 🔍 Points importants

1. **Période calculée automatiquement** : Pas besoin de saisir manuellement la période
2. **Génération mensuelle** : Les factures sont créées automatiquement au début de chaque mois
3. **Rétrocompatibilité** : Les anciennes factures sans période affichent toujours le mois
4. **Flexibilité** : La date de paiement peut être modifiée (pour les paiements en retard par exemple)

## 🎨 Interface utilisateur

- **Tableau des factures** : Colonne "PÉRIODE" au lieu de "MOIS"
- **Format d'affichage** : "du 22/11 au 30/11/2025"
- **Modal de détails** : Affiche la période complète et la date de paiement

---

**Date d'implémentation** : 22 janvier 2025
**Version** : 1.0

