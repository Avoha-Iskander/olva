# Sauvegarde et restauration de la base

## Fonctionnement

- Workflow : `.github/workflows/backup.yml`
- Quand : chaque dimanche à 3 h UTC, ou à la demande (Actions → « Sauvegarde base prod » → Run workflow)
- Quoi : base `olva-prod` (rôles, structure, données). Les photos (Supabase Storage) ne sont pas incluses (question ouverte, SPEC §15)
- Où : onglet **Actions** du dépôt, fichier `olva-prod-AAAA-MM-JJ.tar.gz.gpg`, conservé 90 jours
- Chiffrement : AES-256, avec la phrase secrète `BACKUP_PASSPHRASE`

## Secrets GitHub nécessaires

Dans GitHub : Settings → Secrets and variables → Actions → New repository secret

| Nom                 | Valeur                                                                                                                            |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| `PROD_DB_URL`       | Chaîne de connexion « Session pooler » de olva-prod (Supabase → bouton **Connect**), avec le mot de passe de la base              |
| `BACKUP_PASSPHRASE` | Une longue phrase secrète, **conservée aussi dans un gestionnaire de mots de passe** : sans elle, les sauvegardes sont illisibles |

## Restaurer (test sur olva-dev)

1. Télécharger l'artefact depuis l'onglet Actions et le décompresser (fichier `.gpg`)
2. Déchiffrer puis extraire :
   ```bash
   gpg --decrypt olva-prod-AAAA-MM-JJ.tar.gz.gpg > backup.tar.gz
   tar -xzf backup.tar.gz
   ```
3. Récupérer la chaîne de connexion de **olva-dev** (Supabase → Connect → Session pooler)
4. Rejouer dans l'ordre :
   ```bash
   psql --single-transaction --variable ON_ERROR_STOP=1 \
     --file roles.sql --file schema.sql \
     --command 'SET session_replication_role = replica' \
     --file data.sql \
     --dbname "<chaîne de connexion olva-dev>"
   ```
5. Vérifier quelques recettes dans l'app (preview Vercel)

À faire de temps en temps, pour s'assurer que les sauvegardes sont réellement utilisables.
