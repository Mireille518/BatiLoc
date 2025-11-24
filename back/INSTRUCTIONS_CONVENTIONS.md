# 📋 Instructions pour créer des conventions dans WAMP

## Méthode 1 : Utiliser le script Node.js (Recommandé)

### Étape 1 : Exécuter le script
```bash
cd back
node create-test-conventions.js
```

Le script va :
- ✅ Vérifier les bâtiments existants
- ✅ Vérifier les locataires existants
- ✅ Créer automatiquement des conventions en associant bâtiments et locataires
- ✅ Afficher un résumé des conventions créées

### Résultat attendu :
```
✅ Convention #15 créée
   🏢 Bâtiment: #1001 - Rue Ravalomanda
   👤 Locataire: RAVAO Honorine
   💰 Loyer: 150000 Ar
```

---

## Méthode 2 : Utiliser phpMyAdmin (WAMP)

### Étape 1 : Créer des locataires (si nécessaire)
1. Ouvrez **phpMyAdmin** dans WAMP
2. Sélectionnez votre base de données
3. Allez dans l'onglet **"SQL"**
4. Ouvrez le fichier `insert-locataires.sql`
5. Copiez et exécutez le contenu

### Étape 2 : Créer des conventions
1. Dans phpMyAdmin, allez dans l'onglet **"SQL"**
2. Ouvrez le fichier `insert-conventions.sql`
3. **IMPORTANT** : Modifiez les valeurs `numBat` et `codeCli` selon vos données existantes
4. Exécutez le script

### Étape 3 : Vérifier les conventions créées
Le script SQL inclut une requête SELECT pour voir toutes les conventions avec leurs détails.

---

## Structure d'une convention

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `numConv` | INTEGER | Numéro de convention (auto-incrémenté) | 15 |
| `lieu` | STRING(10) | Lieu de la convention (max 10 caractères) | FIANARANTS |
| `dateConv` | DATEONLY | Date de la convention | 2025-01-01 |
| `statutConv` | BOOLEAN | Statut (0 = En attente, 1 = Confirmé) | 0 |
| `numFact` | INTEGER | Numéro de facture associée (NULL si aucune) | NULL |
| `numBat` | INTEGER | Numéro du bâtiment (référence) | 1001 |
| `codeCli` | INTEGER | Code du locataire (référence) | 9 |

---

## Notes importantes

⚠️ **Le champ `lieu` est limité à 10 caractères maximum**
- ✅ Correct : `FIANARANTS`
- ❌ Incorrect : `FIANARANTSOA` (12 caractères)

⚠️ **Assurez-vous que les `numBat` et `codeCli` existent dans votre base de données**

⚠️ **Une convention ne peut pas être créée deux fois pour le même bâtiment et locataire**

---

## Vérification rapide

Pour voir toutes vos conventions avec leurs détails :
```sql
SELECT 
    c.numConv,
    c.lieu,
    c.dateConv,
    CASE WHEN c.statutConv = 1 THEN 'Confirmé' ELSE 'En attente' END AS statut,
    b.adresse AS adresse_batiment,
    b.montant AS loyer,
    l.nomcli AS nom_locataire,
    l.cin
FROM convention c
LEFT JOIN mbatiment b ON c.numBat = b.numBat
LEFT JOIN locataire l ON c.codeCli = l.codeCli
ORDER BY c.numConv DESC;
```

---

## Prochaines étapes

Une fois les conventions créées, vous pouvez :
1. ✅ Créer des factures pour ces conventions (via l'interface ou le script `create-test-facture.js`)
2. ✅ Enregistrer des paiements pour les factures
3. ✅ Consulter les statistiques

