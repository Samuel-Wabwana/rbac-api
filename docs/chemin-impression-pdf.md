# Chemin : JSON → template HTML → PDF téléchargeable

Ce fichier est la **source de vérité** du chantier. Chaque étape livrée doit y être cochée **et** inscrite dans le [journal](#journal-des-étapes-fournies).

Swagger UI (une fois le serveur lancé) : [http://localhost:3000/docs](http://localhost:3000/docs)

## Objectif

Recevoir un tableau JSON (ex. utilisateurs), fusionner chaque entrée avec un template HTML, produire **un PDF distinct par entrée**, puis permettre le téléchargement.

### Parcours type

1. **Uploader les images** — `POST /printers/images` (champ multipart `file`, 1 à 3 fichiers). Réponse : un objet `{ id, … }` si un seul fichier, un **tableau** d’objets si plusieurs.
2. **Créer le job** — `POST /printers/jobs` avec les ids retournés dans `photos`, les champs partagés du mariage, et un `items` par invité (un PDF chacun).

Exemple de body `POST /printers/jobs` :

```json
{
  "templateId": "user-card",
  "format": "A5",
  "photos": ["<imageId-page1>", "<imageId-page4>"],
  "dayOfWeek": "Samedi",
  "day": "12",
  "month": "Août",
  "year": "2025",
  "partners": ["Hinata", "Naruto"],
  "items": [
    { "name": "user1", "table": "josh" },
    { "name": "user2", "table": "anna" }
  ]
}
```

Dimensions custom (alternative à `format`) :

```json
{
  "templateId": "user-card",
  "width": "148mm",
  "height": "210mm",
  "partners": ["Hinata", "Naruto"],
  "items": [{ "name": "user1", "table": "josh" }]
}
```

### Champs du job (`CreatePrintJobDto`)

| Champ | Obligatoire | Description |
| --- | --- | --- |
| `templateId` | oui | Identifiant du fichier `.hbs` (ex. `user-card`) |
| `partners` | oui | `[prénom1, prénom2]` — partagé par tous les PDF |
| `format` | non | `A4` ou `A5`. Incompatible avec `width`/`height`. Défaut : `A5` |
| `width` | non | Largeur PDF (ex. `148mm`). Obligatoire avec `height` si `format` absent |
| `height` | non | Hauteur PDF (ex. `210mm`). Obligatoire avec `width` si `format` absent |
| `photos` | non | 0 à 3 ids d’images (résultat de `POST /printers/images`) |
| `dayOfWeek` | non | Jour de la semaine (ex. `Samedi`) |
| `day` | non | Jour du mois (ex. `12`) |
| `month` | non | Mois (ex. `Août`) |
| `year` | non | Année (ex. `2025`) |
| `items` | oui | 1 à 30 objets JSON ; **un PDF par élément** |

Les champs hors `items` sont injectés dans **chaque** rendu Handlebars (contexte partagé du job).

## Principes

- Un lot = un **job** d’impression, pas un CRUD « printer » générique.
- Un PDF par élément du tableau.
- Templates versionnés dans le dépôt (`src/printers/templates/`).
- Documenter chaque endpoint dans Swagger au moment où il est ajouté.

## Endpoints

| Méthode | Chemin | Rôle |
| --- | --- | --- |
| `POST` | `/printers/images` | Upload 1 à 3 images PNG/JPEG/WebP (champ `file`), retourne un `id` ou un tableau d’ids |
| `GET` | `/printers/images/:imageId` | Prévisualisation de l’image |
| `POST` | `/printers/jobs` | Génère les PDF (synchrone, max 30 items) |
| `GET` | `/printers/jobs/:jobId` | Statut + URLs de téléchargement |
| `GET` | `/printers/jobs/:jobId/files/:fileId` | PDF d’un item |
| `GET` | `/printers/jobs/:jobId/archive` | ZIP de tous les PDF |

Le CRUD scaffold (`GET/POST/PATCH/DELETE /printers`) a été retiré.

---

## Étapes

### 1. Documentation API (Swagger)

- [x] Installer `@nestjs/swagger`
- [x] Brancher Swagger dans `src/main.ts` (UI sur `/docs`)
- [x] Activer le plugin CLI Nest pour les DTO
- [x] Annoter les contrôleurs existants (`App`, `Printers`)

**Livrable :** `yarn start:dev` → interface lisible sur `/docs`.

### 2. Contrats HTTP du job d’impression

- [x] Remplacer le CRUD scaffold par un modèle **job**
- [x] DTO `CreatePrintJobDto` : `templateId` + `format` (`A4`/`A5`) ou `width`/`height` (optionnels, exclusifs) + `photos` (0 à 3, partagées) + `dayOfWeek` / `day` / `month` / `year` (optionnels, partagés) + `partners` (obligatoire, `[string, string]`) + `items` (tableau JSON)
- [x] Validation (`class-validator` / `class-transformer`) + `ValidationPipe` global
- [x] Schémas Swagger (`@ApiProperty`, réponses 201 / 400)

**Livrable :** le body attendu est documenté et rejeté s’il est invalide.

### 3. Templates HTML

- [x] Dossier `src/printers/templates/` (`user-card.hbs`)
- [x] Moteur de fusion (Handlebars) avec échappement HTML
- [x] Chargement d’un template par `templateId` (fichier connu, pas de chemin libre)

**Livrable :** fusion Handlebars par `templateId`, HTML prêt à imprimer.

#### Template `user-card` (invitation mariage)

Variables **niveau job** (déclarées dans le body du job) :

| Variable | Exemple Handlebars | Usage dans le template |
| --- | --- | --- |
| `partners` | `{{lookup partners 0}}`, `{{lookup partners 1}}` | Prénoms des mariés (pages 1 et 3) |
| `dayOfWeek` | `{{dayOfWeek}}` | Jour de la semaine (page 1) |
| `day` | `{{day}}` | Jour du mois (page 1) |
| `month` | `{{month}}` | Mois (page 1) |
| `year` | `{{year}}` | Année (page 1) |
| `photos` | `{{#image (lookup photos 0)}}` … `{{/image}}` | Page 1 : 1re photo ; page 4 : `lookup photos 1` |

Le template `user-card` attend **2 photos** pour un rendu complet (`photos[0]` couverture, `photos[1]` page RSVP).

Variables **niveau item** (champs libres dans chaque entrée de `items`, ex. invité) :

| Variable | Exemple | Usage |
| --- | --- | --- |
| `name` | `{{name}}` | Nom de l’invité |
| `table` | `{{table}}` | Table assignée |

Helper image : `{{#image …}}` n’affiche la balise `<img>` que si la valeur est une data URL d’image valide (après hydratation côté serveur).

### 4. Moteur HTML → PDF

- [x] Puppeteer, un navigateur réutilisé par lot
- [x] Une page (donc un PDF) par item
- [x] Taille de page via payload (`format` A4/A5 ou `width`/`height`) + `printBackground` + marges 0
- [x] Gérer timeout, erreurs de rendu, fermeture du browser

**Livrable :** buffers PDF valides en local.

### 5. Stockage et identifiants

- [x] Écrire les PDF hors git (`storage/pdfs/`)
- [x] Noms de fichiers sanitisés
- [x] Métadonnées job : `jobId`, liste `{ fileId, filename, item }`

**Livrable :** un job persistant le temps du téléchargement (disque local d’abord).

### 6. Endpoints de génération et de lecture

- [x] `POST /printers/jobs` → crée le job, lance la génération
- [x] `GET /printers/jobs/:jobId` → statut + liste des fichiers
- [x] Documenter dans Swagger (body, 201, 404)

**Livrable :** un client peut lancer un lot et voir les fichiers produits.

### 7. Téléchargement

- [x] `GET /printers/jobs/:jobId/files/:fileId` → PDF, `Content-Disposition: attachment`
- [x] 404 si job ou fichier inconnu
- [x] Documenter le type `application/pdf` dans Swagger

**Livrable :** chaque PDF est retéléchargeable séparément.

### 8. Lot volumineux (si besoin)

- [x] Pas de BullMQ : génération **synchrone** plafonnée à 30 items (`MAX_PRINT_JOB_ITEMS`)
- [x] Statuts `pending | processing | done | failed` (le POST attend `done` ou `failed`)
- [x] `GET /printers/jobs/:jobId/archive` : ZIP de tout le job

**Livrable :** au-delà de 30 items, 400 ; file d’attente Redis reportée (hors scope).

### 9. Tests et durcissement

- [x] Tests unitaires fusion template + sanitization des noms
- [x] Test e2e : POST job → GET fichier (PDF non vide ; `PdfService` mocké pour la CI)
- [x] Notes Docker : Chromium / libs système pour le moteur PDF

**Livrable :** le chemin critique est reproductible en CI.

### 10. Images dans les templates

- [x] `POST /printers/images` (multipart `file`, **1 à 3 fichiers** par requête) : PNG / JPEG / WebP, max 5 Mo chacun, identifiant UUID
- [x] Réponse : `{ id, originalName, contentType, url }` (1 fichier) ou **tableau** de ces objets (2–3 fichiers) — jamais un chemin disque
- [x] Au rendu du job, `photos` (niveau job, 0 à 3) sont hydratées en data URL et injectées dans chaque item
- [x] Helper Handlebars `{{#image (lookup photos 0)}}` / `{{#image (lookup photos 1)}}` dans `user-card.hbs`
- [x] `GET /printers/images/:imageId` pour prévisualiser
- [x] Fichiers hors git (`storage/images/`)
- [x] Erreurs Multer (ex. fichier trop lourd) → 400/413 via `MulterExceptionFilter` (compatible Multer 2.x)

**Livrable :** upload (simple ou groupé) → ids dans `photos` au niveau du job → images dans chaque PDF.

### 11. Police du template

- [x] Dossier versionné `src/printers/fonts/`
- [x] Fichier nommé comme le template : `user-card.woff2` (ou `.woff` / `.ttf` / `.otf`)
- [x] Au rendu, hydratation en data URL + `@font-face` dans le HTML
- [x] Si le fichier est absent, le job continue avec Arial / Helvetica
- [x] `page.evaluate(() => document.fonts.ready)` avant `page.pdf()`

**Livrable :** déposer la police à côté du template ; PDF typographié si le fichier est là, sinon fallback silencieux.

#### Docker / Chromium

Puppeteer lance Chrome. Dans une image Linux, installer les libs système (ex. `ca-certificates`, `fonts-liberation`, dépendances Chromium) et lancer Chrome avec `--no-sandbox` (déjà passé dans `PdfService`). Copier aussi les templates `.hbs` et les polices (`*.woff2`, `*.woff`, `*.ttf`, `*.otf`) dans l’image (`nest build` les copie via `nest-cli.json` assets).

---

## Journal des étapes fournies

À chaque livraison, ajouter une ligne. Ne pas se contenter de cocher la case.

| Date | Étape | Statut | Détail |
| --- | --- | --- | --- |
| 2026-09-17 | 1. Documentation API (Swagger) | fournie | `@nestjs/swagger`, UI `/docs`, plugin CLI, tags App + Printers |
| 2026-09-17 | 2. Contrats HTTP du job | fournie | `CreatePrintJobDto`, `ValidationPipe` global, CRUD scaffold supprimé |
| 2026-09-17 | 3. Templates HTML | fournie | Handlebars `user-card.hbs`, templateId whitelist |
| 2026-09-17 | 4. Moteur HTML → PDF | fournie | Puppeteer, un browser par job, A4 + printBackground |
| 2026-09-17 | 5. Stockage et identifiants | fournie | `storage/pdfs/{jobId}/`, meta.json, filenames sanitisés |
| 2026-09-17 | 6. Endpoints génération / lecture | fournie | `POST /printers/jobs`, `GET /printers/jobs/:jobId` |
| 2026-09-17 | 7. Téléchargement | fournie | `GET .../files/:fileId` attachment PDF |
| 2026-09-17 | 8. Lot volumineux | fournie | max 30 items sync, statuts, ZIP `/archive` (pas de BullMQ) |
| 2026-09-17 | 9. Tests et durcissement | fournie | unitaires template/filename/job, e2e POST→GET, notes Docker |
| 2026-09-17 | 10. Images dans les templates | fournie | upload multipart, id UUID, hydrate data URL, helper Handlebars |
| 2026-09-17 | 10. Images dans les templates | fournie | `photo` déplacé hors de `items` : un id partagé par tout le job |
| 2026-09-17 | 11. Police du template | fournie | `src/printers/fonts/{templateId}.*` → data URL, ignore si absent |
| 2026-09-18 | 2. Contrats HTTP du job | fournie | `photo` → `photos` (0 à 3) ; ajout `dayOfWeek`, `day`, `year` au niveau job |
| 2026-09-18 | 2. Contrats HTTP du job | fournie | `partners` obligatoire `[string, string]` au niveau job |
| 2026-09-18 | 3. Templates HTML | fournie | `user-card` : variables `partners`, `dayOfWeek`, `day`, `month`, `year`, `photos` documentées |
| 2026-09-18 | 10. Images dans les templates | fournie | upload 1–3 fichiers par requête ; `MulterExceptionFilter` ; syntaxe `lookup photos N` |
| 2026-09-18 | 2. Contrats HTTP du job | fournie | ajout `month` (optionnel) au niveau job, lié à `{{month}}` dans `user-card` |
| 2026-09-18 | 2. Contrats HTTP du job | fournie | `format` (`A4`/`A5`) ou `width`/`height` pour la taille PDF ; défaut A5 ; marges 0 dans `PdfService` |
| 2026-09-18 | 4. Moteur HTML → PDF | fournie | taille de page pilotée par le payload job (plus de `format: A4` fixe) |

---

## Hors scope (pour plus tard)

- Auth / RBAC sur les jobs
- Templates uploadés par l’utilisateur
- Stockage objet (S3 / MinIO)
- File d’attente distribuée (BullMQ / Redis) au-delà de 30 items
