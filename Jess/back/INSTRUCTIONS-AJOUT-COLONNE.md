# Instructions pour ajouter la colonne motifInactivite

## Problème
L'erreur "Erreur lors du chargement des bâtiments" est probablement due à l'absence de la colonne `motifInactivite` dans la table `mbatiment` de votre base de données.

## Solution

### Option 1 : Exécuter le script SQL directement

1. Ouvrez votre client MySQL (phpMyAdmin, MySQL Workbench, ou ligne de commande)
2. Sélectionnez votre base de données
3. Exécutez cette commande SQL :

```sql
ALTER TABLE mbatiment 
ADD COLUMN motifInactivite TEXT NULL 
COMMENT 'Motif de l''inactivité du bâtiment (réparation, démolition, etc.)';
```

### Option 2 : Utiliser le fichier SQL fourni

1. Modifiez le fichier `back/AJOUTER-MOTIF-INACTIVITE.bat` avec vos identifiants MySQL
2. Exécutez le fichier `.bat`
3. Ou exécutez directement :
   ```bash
   mysql -u votre_utilisateur -p votre_base_de_donnees < back/add-motif-inactivite.sql
   ```

### Option 3 : Vérifier si la colonne existe déjà

```sql
SHOW COLUMNS FROM mbatiment LIKE 'motifInactivite';
```

Si la colonne n'existe pas, exécutez la commande ALTER TABLE ci-dessus.

## Après l'ajout de la colonne

Redémarrez votre serveur backend pour que les changements prennent effet.

## Note

Le code backend a été modifié pour gérer l'absence de cette colonne, mais il est recommandé de l'ajouter pour éviter tout problème.

