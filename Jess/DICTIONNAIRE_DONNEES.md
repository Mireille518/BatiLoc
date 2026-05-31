# DICTIONNAIRE DE DONNÉES
## Système de Gestion de Conventions Immobilières BATILOC

---

## 1. INTRODUCTION

Ce dictionnaire de données décrit de manière exhaustive la structure de la base de données MySQL utilisée par le système de gestion de conventions immobilières BATILOC. Il présente toutes les tables, leurs attributs, types de données, contraintes et relations inter-tables.

**Base de données** : MySQL  
**Système de gestion** : Sequelize ORM  
**Nombre de tables** : 5 tables principales

---

## 2. TABLES DE LA BASE DE DONNÉES

### 2.1. Table : `mbatiment`

**Description** : Cette table stocke les informations relatives aux bâtiments immobiliers gérés par le système.

| Attribut | Type | Taille | Nullable | Clé | Description |
|----------|------|--------|----------|-----|-------------|
| `numBat` | INTEGER | - | NON | PK | Numéro unique du bâtiment (clé primaire, non auto-incrémenté) |
| `image` | BLOB | LONG | NON | - | Image du bâtiment stockée en format binaire |
| `adresse` | VARCHAR | 20 | NON | - | Adresse du bâtiment |
| `ville` | VARCHAR | 60 | OUI | - | Ville où se trouve le bâtiment |
| `quartier` | VARCHAR | 60 | OUI | - | Quartier du bâtiment |
| `latitude` | DOUBLE | - | OUI | - | Coordonnée géographique latitude pour la géolocalisation |
| `longitude` | DOUBLE | - | OUI | - | Coordonnée géographique longitude pour la géolocalisation |
| `montant` | DOUBLE | - | NON | - | Montant du loyer mensuel en Ariary (MGA) |
| `statut` | BOOLEAN | - | NON | - | Statut du bâtiment (true = actif, false = inactif) |
| `motifInactivite` | TEXT | - | OUI | - | Motif d'inactivation du bâtiment si celui-ci est désactivé |

**Index** :
- Index primaire sur `numBat`

**Relations** :
- Une relation 1-N avec la table `convention` (un bâtiment peut avoir plusieurs conventions)
- Une relation 1-N avec la table `facture` (un bâtiment peut avoir plusieurs factures)

---

### 2.2. Table : `locataire`

**Description** : Cette table stocke les informations personnelles des locataires.

| Attribut | Type | Taille | Nullable | Clé | Description |
|----------|------|--------|----------|-----|-------------|
| `codeCli` | INTEGER | - | NON | PK | Code unique du client/locataire (clé primaire, auto-incrémenté) |
| `nomcli` | VARCHAR | 50 | NON | - | Nom complet du locataire |
| `datenais` | DATE | - | NON | - | Date de naissance du locataire |
| `lieunais` | VARCHAR | 20 | NON | - | Lieu de naissance du locataire |
| `pere` | VARCHAR | 50 | NON | - | Nom du père du locataire |
| `mere` | VARCHAR | 50 | NON | - | Nom de la mère du locataire |
| `cin` | VARCHAR | 15 | NON | - | Numéro de Carte d'Identité Nationale (identifiant unique) |
| `delivcin` | DATE | - | NON | - | Date de délivrance de la CIN |
| `adressecli` | VARCHAR | 10 | NON | - | Adresse actuelle du locataire |
| `activite` | VARCHAR | 20 | NON | - | Profession ou activité du locataire |

**Index** :
- Index primaire sur `codeCli`

**Relations** :
- Une relation 1-N avec la table `convention` (un locataire peut avoir plusieurs conventions)
- Une relation 1-N avec la table `facture` (un locataire peut avoir plusieurs factures)

**Contraintes** :
- Le champ `cin` doit être unique (non explicitement défini comme UNIQUE dans le modèle, mais utilisé comme identifiant unique dans l'application)

---

### 2.3. Table : `convention`

**Description** : Cette table stocke les conventions de location entre un locataire et un bâtiment.

| Attribut | Type | Taille | Nullable | Clé | Description |
|----------|------|--------|----------|-----|-------------|
| `numConv` | INTEGER | - | NON | PK | Numéro unique de la convention (clé primaire, auto-incrémenté) |
| `lieu` | VARCHAR | 10 | NON | - | Lieu de signature de la convention |
| `dateConv` | DATE | - | NON | - | Date de signature de la convention |
| `statutConv` | BOOLEAN | - | NON | - | Statut de la convention (true = active, false = annulée), valeur par défaut : false |
| `numFact` | INTEGER | - | OUI | FK | Numéro de facture associé (clé étrangère vers `facture.numFact`) |
| `numBat` | INTEGER | - | NON | FK | Numéro du bâtiment (clé étrangère vers `mbatiment.numBat`) |
| `codeCli` | INTEGER | - | NON | FK | Code du locataire (clé étrangère vers `locataire.codeCli`) |

**Index** :
- Index primaire sur `numConv`
- Index sur `statutConv` (pour les recherches par statut)
- Index sur `numFact` (clé étrangère)
- Index sur `numBat` (clé étrangère)
- Index sur `codeCli` (clé étrangère)

**Relations** :
- Relation N-1 avec `mbatiment` (plusieurs conventions peuvent être associées à un bâtiment)
- Relation N-1 avec `locataire` (plusieurs conventions peuvent être associées à un locataire)
- Relation N-1 avec `facture` (plusieurs conventions peuvent être associées à une facture)
- Relation 1-N avec `utilisateur` (une convention peut être associée à plusieurs utilisateurs)

**Contraintes** :
- `numBat` doit référencer un bâtiment existant
- `codeCli` doit référencer un locataire existant
- `numFact` peut être NULL (convention sans facture)

---

### 2.4. Table : `facture`

**Description** : Cette table stocke les factures mensuelles générées pour les conventions actives.

| Attribut | Type | Taille | Nullable | Clé | Description |
|----------|------|--------|----------|-----|-------------|
| `numFact` | INTEGER | - | NON | PK | Numéro unique de la facture (clé primaire, auto-incrémenté) |
| `dm` | INTEGER | - | NON | UK | Numéro DM (unique) |
| `exercice` | DATE | - | NON | - | Exercice comptable de la facture |
| `mois` | DATE | - | NON | - | Mois de facturation (format DATEONLY) |
| `codegare` | INTEGER | - | NON | - | Code gare (référence interne) |
| `depart` | VARCHAR | 10 | NON | - | Point de départ (référence interne) |
| `destination` | VARCHAR | 10 | NON | - | Point de destination (référence interne) |
| `libelles` | VARCHAR | 100 | NON | - | Libellé descriptif de la facture |
| `numBat` | INTEGER | - | NON | FK | Numéro du bâtiment (clé étrangère vers `mbatiment.numBat`) |
| `numConv` | INTEGER | - | NON | FK | Numéro de convention (clé étrangère vers `convention.numConv`) |
| `codeCli` | INTEGER | - | NON | FK | Code du locataire (clé étrangère vers `locataire.codeCli`) |
| `statutPaiement` | BOOLEAN | - | NON | - | Statut de paiement (true = payé, false = non payé), valeur par défaut : false |
| `dateDebut` | DATE | - | OUI | - | Date de début de la période couverte par le paiement |
| `dateFin` | DATE | - | OUI | - | Date de fin de la période couverte par le paiement |
| `datePaiement` | DATE | - | OUI | - | Date effective du paiement |

**Index** :
- Index primaire sur `numFact`
- Index unique sur `dm`
- Index sur `numBat` (clé étrangère)
- Index sur `codeCli` (clé étrangère)
- Index sur `numConv` (clé étrangère)

**Relations** :
- Relation N-1 avec `mbatiment` (plusieurs factures peuvent être associées à un bâtiment)
- Relation N-1 avec `convention` (plusieurs factures peuvent être associées à une convention)
- Relation N-1 avec `locataire` (plusieurs factures peuvent être associées à un locataire)
- Relation 1-N avec `convention` (une facture peut être associée à plusieurs conventions)

**Contraintes** :
- `dm` doit être unique
- `numBat` doit référencer un bâtiment existant
- `numConv` doit référencer une convention existante
- `codeCli` doit référencer un locataire existant

---

### 2.5. Table : `utilisateur`

**Description** : Cette table stocke les informations des utilisateurs du système (administrateurs, caissiers, opérateurs de saisie).

| Attribut | Type | Taille | Nullable | Clé | Description |
|----------|------|--------|----------|-----|-------------|
| `matricule` | VARCHAR | 10 | NON | PK | Matricule unique de l'utilisateur (clé primaire) |
| `nom` | VARCHAR | 60 | NON | - | Nom complet de l'utilisateur |
| `contact` | VARCHAR | 13 | NON | UK | Numéro de téléphone de l'utilisateur (unique) |
| `email` | VARCHAR | 30 | NON | UK | Adresse email de l'utilisateur (unique) |
| `mdp` | VARCHAR | 225 | NON | - | Mot de passe hashé avec bcrypt (jamais stocké en clair) |
| `numConv` | INTEGER | - | OUI | FK | Numéro de convention associé (clé étrangère vers `convention.numConv`) |
| `poste` | VARCHAR | 20 | NON | - | Poste de l'utilisateur (administrateur, caissier, opérateur de saisie) |

**Index** :
- Index primaire sur `matricule`
- Index unique sur `contact`
- Index unique sur `email`
- Index sur `numConv` (clé étrangère)

**Relations** :
- Relation N-1 avec `convention` (plusieurs utilisateurs peuvent être associés à une convention)

**Contraintes** :
- `contact` doit être unique
- `email` doit être unique
- `poste` doit être l'un des suivants : "administrateur", "caissier", "opérateur de saisie"
- `numConv` peut être NULL (utilisateur non associé à une convention spécifique)
- `mdp` est stocké en hash bcrypt (jamais en clair)

**Valeurs possibles pour `poste`** :
- `administrateur` : Accès complet au système
- `caissier` : Gestion des factures et paiements
- `opérateur de saisie` : Création et modification de conventions

---

## 3. SCHÉMA DES RELATIONS ENTRE TABLES

### 3.1. Diagramme des relations

```
┌─────────────┐
│  mbatiment  │
│  (numBat)   │
└──────┬──────┘
       │
       │ 1
       │
       │ N
       ├─────────────────┐
       │                 │
┌──────▼──────┐   ┌──────▼──────┐
│ convention  │   │   facture   │
│ (numConv)   │   │  (numFact)  │
└──────┬──────┘   └──────┬──────┘
       │                 │
       │ N               │ N
       │                 │
       │ 1               │ 1
┌──────▼──────┐   ┌──────▼──────┐
│  locataire  │   │  mbatiment  │
│ (codeCli)   │   │  (numBat)   │
└─────────────┘   └─────────────┘
       │
       │ 1
       │
       │ N
┌──────▼──────┐
│ utilisateur │
│ (matricule) │
└─────────────┘
```

### 3.2. Description des relations

1. **`mbatiment` ↔ `convention`** : Relation 1-N
   - Un bâtiment peut avoir plusieurs conventions
   - Une convention est associée à un seul bâtiment

2. **`locataire` ↔ `convention`** : Relation 1-N
   - Un locataire peut avoir plusieurs conventions
   - Une convention est associée à un seul locataire

3. **`convention` ↔ `facture`** : Relation 1-N (bidirectionnelle)
   - Une convention peut avoir plusieurs factures
   - Une facture est associée à une convention
   - Une convention peut référencer une facture (relation optionnelle)

4. **`mbatiment` ↔ `facture`** : Relation 1-N
   - Un bâtiment peut avoir plusieurs factures
   - Une facture est associée à un seul bâtiment

5. **`locataire` ↔ `facture`** : Relation 1-N
   - Un locataire peut avoir plusieurs factures
   - Une facture est associée à un seul locataire

6. **`convention` ↔ `utilisateur`** : Relation 1-N
   - Une convention peut être associée à plusieurs utilisateurs
   - Un utilisateur peut être associé à une convention (optionnel)

---

## 4. TYPES DE DONNÉES UTILISÉS

| Type Sequelize | Type MySQL | Description | Exemple |
|----------------|------------|-------------|---------|
| `INTEGER` | INT | Nombre entier | 1001, 200000 |
| `STRING(n)` | VARCHAR(n) | Chaîne de caractères de longueur maximale n | "Antananarivo", "admin@example.com" |
| `DOUBLE` | DOUBLE | Nombre décimal à double précision | 150000.50, -18.8792 |
| `BOOLEAN` | TINYINT(1) | Valeur booléenne (0 ou 1) | true, false |
| `DATEONLY` | DATE | Date sans heure (YYYY-MM-DD) | "2024-01-15" |
| `DATE` | DATETIME | Date avec heure | "2024-01-15 10:30:00" |
| `TEXT` | TEXT | Texte de longueur variable | "Bâtiment en rénovation" |
| `BLOB('long')` | LONGBLOB | Données binaires de grande taille | Image JPEG, PNG |

---

## 5. CONTRAINTES D'INTÉGRITÉ

### 5.1. Contraintes de clé primaire (PK)
- Chaque table possède une clé primaire unique
- Les clés primaires garantissent l'unicité des enregistrements

### 5.2. Contraintes de clé étrangère (FK)
- Toutes les clés étrangères garantissent l'intégrité référentielle
- Suppression en cascade configurée pour certaines relations (ex: suppression d'une facture supprime les conventions associées)

### 5.3. Contraintes d'unicité (UK)
- `utilisateur.contact` : unique
- `utilisateur.email` : unique
- `facture.dm` : unique
- `locataire.cin` : utilisé comme identifiant unique dans l'application

### 5.4. Contraintes de non-nullabilité
- Les champs marqués `allowNull: false` sont obligatoires
- Les champs marqués `allowNull: true` sont optionnels

---

## 6. INDEX ET PERFORMANCES

### 6.1. Index primaires
- Toutes les tables ont un index primaire sur leur clé primaire

### 6.2. Index secondaires
- Index sur les clés étrangères pour améliorer les performances des jointures
- Index sur `convention.statutConv` pour les recherches par statut
- Index unique sur `facture.dm` pour garantir l'unicité

### 6.3. Optimisations
- Utilisation de BTREE pour tous les index
- Index sur les champs fréquemment utilisés dans les recherches

---

## 7. RÈGLES MÉTIER IMPLÉMENTÉES

### 7.1. Gestion des conventions
- Une convention doit être associée à un bâtiment actif
- Une convention doit être associée à un locataire valide
- Le statut d'une convention peut être modifié (active/annulée)

### 7.2. Gestion des factures
- Une facture doit être associée à une convention active
- Le statut de paiement peut être modifié par le caissier ou l'administrateur
- Les dates de période de paiement sont optionnelles

### 7.3. Gestion des utilisateurs
- Le mot de passe est toujours hashé (bcrypt)
- Le poste détermine les permissions d'accès
- Un utilisateur peut être associé à une convention (optionnel)

### 7.4. Gestion des bâtiments
- Un bâtiment peut être activé ou désactivé
- Le motif d'inactivation est enregistré si le bâtiment est désactivé
- Les coordonnées géographiques sont optionnelles

---

## 8. CONCLUSION

Ce dictionnaire de données présente de manière exhaustive la structure de la base de données du système de gestion de conventions immobilières BATILOC. Il comprend 5 tables principales, leurs attributs, types de données, contraintes et relations inter-tables. La structure respecte les principes de normalisation et garantit l'intégrité des données.

---

**Note pour le jury** : Ce dictionnaire de données a été conçu pour répondre aux besoins de gestion immobilière identifiés lors de l'analyse des besoins. La structure est extensible et peut évoluer pour intégrer de nouvelles fonctionnalités selon les besoins futurs de l'organisation.

**Instructions pour convertir en Word :**

1. Ouvrir dans Word :
   - Ouvrir Word
   - Fichier → Ouvrir
   - Sélectionner `DICTIONNAIRE_DONNEES.md`
   - Word le convertira automatiquement

2. Convertir en ligne :
   - Aller sur https://cloudconvert.com/md-to-docx
   - Téléverser le fichier `.md`
   - Télécharger le `.docx`

3. Utiliser Pandoc (si installé) :
   ```bash
   pandoc DICTIONNAIRE_DONNEES.md -o DICTIONNAIRE_DONNEES.docx
   ```

Souhaitez-vous que je crée ce fichier dans votre projet ? Je peux le placer à la racine pour un accès facile.
