# 📊 DONNÉES DE TEST - OPÉRATEUR DE SAISIE

## ✅ Données insérées avec succès !

**Date d'insertion** : 20 novembre 2025

---

## 🏢 BÂTIMENTS CRÉÉS (8 bâtiments)

| N° Bât | Adresse | Montant | Statut |
|--------|---------|---------|--------|
| 1001 | Rue Ravalomanda | 150 000 Ar | ✅ Disponible |
| 1002 | Avenue Rainibe | 200 000 Ar | ✅ Disponible |
| 1003 | Boulevard Ratsima | 180 000 Ar | ✅ Disponible |
| 1004 | Route Ambohima | 250 000 Ar | ✅ Disponible |
| 1005 | Cité Mahazo | 175 000 Ar | ✅ Disponible |
| 1006 | Quartier Ankadif | 220 000 Ar | ❌ Non disponible |
| 1007 | Zone Betsileo | 160 000 Ar | ✅ Disponible |
| 1008 | Secteur Tsaraso | 190 000 Ar | ✅ Disponible |

**Total disponible** : 7 bâtiments

---

## 👥 LOCATAIRES CRÉÉS (8 locataires)

### 1. RAKOTO Jean Marie
- **CIN** : 101234567890
- **Date de naissance** : 15/03/1985
- **Lieu de naissance** : Fianarantsoa
- **Père** : RAKOTO Paul
- **Mère** : RASOA Marie
- **Adresse** : Lot IVA123
- **Activité** : Commerçant
- **Délivrance CIN** : 20/06/2015

### 2. RANDRIA Sophie
- **CIN** : 101234567891
- **Date de naissance** : 22/07/1990
- **Lieu de naissance** : Ambositra
- **Père** : RANDRIA Michel
- **Mère** : RAVAO Jeanne
- **Adresse** : Lot IIC456
- **Activité** : Enseignante
- **Délivrance CIN** : 10/03/2018

### 3. RAHARIJAONA Pierre
- **CIN** : 101234567892
- **Date de naissance** : 05/11/1982
- **Lieu de naissance** : Ambalavao
- **Père** : RAHARIJAONA Jean
- **Mère** : RASOAMANANA Louise
- **Adresse** : Tanambao
- **Activité** : Fonctionnaire
- **Délivrance CIN** : 15/09/2016

### 4. RASOANIRINA Nicole
- **CIN** : 101234567893
- **Date de naissance** : 18/05/1988
- **Lieu de naissance** : Fianarantsoa
- **Père** : RASOANIRINA Georges
- **Mère** : RAKOTOMALALA Anne
- **Adresse** : Mahazoari
- **Activité** : Infirmière
- **Délivrance CIN** : 08/12/2017

### 5. ANDRIANASOLO Daniel
- **CIN** : 101234567894
- **Date de naissance** : 30/09/1975
- **Lieu de naissance** : Manakara
- **Père** : ANDRIANASOLO Thomas
- **Mère** : RAZAFINDRA Catherine
- **Adresse** : Bvd France
- **Activité** : Médecin
- **Délivrance CIN** : 25/05/2014

### 6. RAJAONAH Hortense
- **CIN** : 101234567895
- **Date de naissance** : 12/01/1992
- **Lieu de naissance** : Fianarantsoa
- **Père** : RAJAONAH Albert
- **Mère** : RAVELO Sylvie
- **Adresse** : Ankadifot
- **Activité** : Avocate
- **Délivrance CIN** : 14/02/2019

### 7. RAKOTONDRAZAKA Claude
- **CIN** : 101234567896
- **Date de naissance** : 27/08/1980
- **Lieu de naissance** : Ihosy
- **Père** : RAKOTONDRAZAKA François
- **Mère** : RASOLONJATOVO Martine
- **Adresse** : RN7 Ihosy
- **Activité** : Ingénieur
- **Délivrance CIN** : 30/11/2015

### 8. RAMANANTSOA Elisabeth
- **CIN** : 101234567897
- **Date de naissance** : 03/12/1987
- **Lieu de naissance** : Fianarantsoa
- **Père** : RAMANANTSOA Henri
- **Mère** : RABENATOANDRO Alice
- **Adresse** : Andranome
- **Activité** : Pharmacienne
- **Délivrance CIN** : 19/07/2018

---

## 📄 CONVENTIONS CRÉÉES (7 conventions)

| N° Conv | Locataire | Bâtiment | Adresse | Montant | Statut |
|---------|-----------|----------|---------|---------|--------|
| 1 | RAKOTO Jean Marie | 1001 | Rue Ravalomanda | 150 000 Ar | ✅ Active |
| 2 | RANDRIA Sophie | 1002 | Avenue Rainibe | 200 000 Ar | ✅ Active |
| 3 | RAHARIJAONA Pierre | 1003 | Boulevard Ratsima | 180 000 Ar | ✅ Active |
| 4 | RASOANIRINA Nicole | 1004 | Route Ambohima | 250 000 Ar | ✅ Active |
| 5 | ANDRIANASOLO Daniel | 1005 | Cité Mahazo | 175 000 Ar | ❌ Annulée |
| 6 | RAJAONAH Hortense | 1007 | Zone Betsileo | 160 000 Ar | ✅ Active |
| 7 | RAKOTONDRAZAKA Claude | 1008 | Secteur Tsaraso | 190 000 Ar | ✅ Active |

**Total actives** : 6 conventions
**Total annulées** : 1 convention

---

## 🎯 SCÉNARIOS DE TEST POUR L'OPÉRATEUR DE SAISIE

### Scénario 1 : Consulter les conventions existantes
1. Connectez-vous avec le compte **em-100900** (Opérateur de saisie)
2. Accédez à la section "Conventions"
3. Vous devriez voir les 7 conventions listées ci-dessus
4. Utilisez la recherche et les filtres

### Scénario 2 : Créer une nouvelle convention
1. Cliquez sur "Nouvelle Convention"
2. **Étape 1 - Bâtiment** :
   - Sélectionnez le bâtiment 1006 (Quartier Ankadif - 220 000 Ar)
   - L'adresse et le montant sont pré-remplis
3. **Étape 2 - Locataire** :
   - Utilisez RAMANANTSOA Elisabeth (CIN: 101234567897)
   - Ou créez un nouveau locataire
4. **Étape 3 - Confirmation** :
   - Vérifiez les informations
   - Validez la création

### Scénario 3 : Modifier une convention existante
1. Sélectionnez la Convention N°1 (RAKOTO Jean Marie)
2. Modifiez le statut ou les informations
3. **Important** : L'opérateur de saisie peut modifier maximum 2 fois
4. Au-delà, un administrateur doit intervenir

### Scénario 4 : Créer une convention avec un nouveau locataire
1. Cliquez sur "Nouvelle Convention"
2. Sélectionnez un bâtiment disponible
3. Créez un nouveau locataire avec ces informations :
   ```
   Nom : RAVALOMANANA Hery
   Date naissance : 15/08/1985
   Lieu naissance : Fianarantsoa
   Père : RAVALOMANANA Jean
   Mère : RASOA Marie
   CIN : 101234567898
   Délivrance CIN : 20/01/2020
   Adresse : Centre V
   Activité : Comptable
   ```

### Scénario 5 : Annuler une convention
1. Sélectionnez une convention active
2. Changez le statut à "Annulée"
3. La convention reste dans la base mais devient inactive

---

## 📊 STATISTIQUES DISPONIBLES

### Par statut de bâtiment :
- Disponibles : 7
- Non disponibles : 1

### Par statut de convention :
- Actives : 6
- Annulées : 1

### Par activité de locataire :
- Commerçant : 1
- Enseignante : 1
- Fonctionnaire : 1
- Infirmière : 1
- Médecin : 1
- Avocate : 1
- Ingénieur : 1
- Pharmacienne : 1

---

## 🔄 RÉINITIALISER LES DONNÉES

Si vous souhaitez réinsérer les données ou en ajouter plus :

```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node seed-data-operateur.js
```

Le script est intelligent et ne duplique pas les données existantes.

---

## 🧪 TESTER AVEC LES DIFFÉRENTS RÔLES

### Opérateur de saisie (em-100900)
✅ **Peut** :
- Consulter toutes les conventions
- Créer de nouvelles conventions
- Modifier les conventions (max 2 fois)

❌ **Ne peut pas** :
- Supprimer des conventions
- Créer des factures
- Gérer les bâtiments
- Gérer les utilisateurs

### Caissier (300000)
✅ **Peut** :
- Consulter les conventions
- Créer des factures pour les conventions actives
- Gérer les paiements

### Administrateur (200000 ou ADMIN001)
✅ **Peut tout faire** :
- CRUD complet sur bâtiments
- CRUD complet sur conventions
- CRUD complet sur factures
- Gérer les utilisateurs
- Accès aux statistiques

---

## 💡 CONSEILS D'UTILISATION

1. **Recherche** : Utilisez la barre de recherche pour trouver rapidement :
   - Par numéro de bâtiment
   - Par nom de locataire
   - Par numéro de CIN

2. **Filtres** : Combinez les filtres pour affiner :
   - Par statut (Active/Annulée)
   - Par bâtiment
   - Par année

3. **Pagination** : Naviguez entre les pages pour voir toutes les conventions

4. **Export** : Fonctionnalité d'export Excel/PDF (à venir dans une prochaine version)

---

## 📞 BESOIN D'AIDE ?

### Vérifier les données insérées
```powershell
cd c:\Users\Rayah\Desktop\Jess\back
node test-db-connection.js
```

### Voir les conventions en base de données
Ouvrez phpMyAdmin : http://localhost/phpmyadmin
- Base : batiment
- Tables : mbatiment, locataire, convention

---

## ✨ PROCHAINES ÉTAPES

1. ✅ **Connectez-vous** avec le compte opérateur de saisie
2. ✅ **Testez** toutes les fonctionnalités
3. ✅ **Créez** de nouvelles conventions
4. ✅ **Modifiez** les conventions existantes
5. ✅ **Explorez** les différentes vues et filtres

---

**🎉 Amusez-vous bien avec vos données de test !**

*Dernière mise à jour : 20 novembre 2025*
